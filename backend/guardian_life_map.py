"""Per-user, revisioned candidate memory. Never an authorization source.

No derived vector cache is persisted: retrieval filters current records first.
Deletion scrubs content and provenance spans from all revisions of the fact.
"""
from copy import deepcopy
from datetime import datetime, timezone
from hashlib import sha256
import json

PORTALS = frozenset(('home', 'work', 'creativity', 'wellbeing', 'relationships', 'community', 'style'))


class LifeMapStore:
    def __init__(self, collection):
        self.collection = collection

    async def snapshot(self, user_id):
        if not user_id:
            raise ValueError('user_required')
        await self.collection.update_one({'user_id': user_id}, {'$setOnInsert': {'user_id': user_id, 'version': 0, 'records': [], 'events': []}}, upsert=True)
        return await self.collection.find_one({'user_id': user_id}, {'_id': 0})

    async def _change(self, user_id, operation):
        for _ in range(5):
            state = await self.snapshot(user_id)
            version = state['version']
            result = operation(state)
            if len(json.dumps(state, ensure_ascii=False).encode('utf-8')) > 8 * 1024 * 1024:
                raise ValueError('life_map_byte_capacity_reached')
            written = await self.collection.update_one({'user_id': user_id, 'version': version}, {'$set': {'records': state['records'], 'events': state['events']}, '$inc': {'version': 1}})
            if written.matched_count == 1:
                return deepcopy(result)
        raise RuntimeError('life_map_conflict')

    async def save(self, user_id, *, fact_id, portal, text, source_id, source_span, expected_revision=0):
        if portal not in PORTALS or not fact_id.strip() or not source_id.strip() or not text.strip() or not source_span.strip():
            raise ValueError('memory_provenance_required')
        if max(len(text), len(source_span)) > 8000 or max(len(fact_id), len(source_id)) > 200:
            raise ValueError('memory_too_large')
        def operation(state):
            revisions = [r for r in state['records'] if r['factId'] == fact_id]
            revision = max((r['revision'] for r in revisions), default=0)
            if revision != expected_revision:
                raise ValueError('memory_revision_conflict')
            if len(state['records']) >= 1000:
                raise ValueError('memory_capacity_reached')
            for record in revisions:
                if record['status'] == 'current':
                    record['status'] = 'superseded'
            record = {'factId': fact_id, 'revision': revision + 1, 'portal': portal, 'text': text, 'sourceId': source_id, 'sourceSpan': source_span, 'status': 'current', 'recordedAt': datetime.now(timezone.utc).isoformat(), 'evidenceStatus': 'USER_RECORDED', 'authority': False}
            state['records'].append(record)
            return record
        return await self._change(user_id, operation)

    async def delete(self, user_id, fact_id):
        def operation(state):
            found = False
            for record in state['records']:
                if record['factId'] == fact_id:
                    found = True
                    record.update(text='', sourceSpan='', sourceId='', status='deleted')
            return {'deleted': found, 'scope': 'life-map-records-and-retrieval', 'externalCopiesDeleted': False}
        return await self._change(user_id, operation)

    async def recall(self, user_id, *, portal, query):
        if portal not in PORTALS:
            raise ValueError('invalid_portal')
        state = await self.snapshot(user_id)
        terms = set(query.lower().split())
        candidates = [r for r in state['records'] if r['status'] == 'current' and r['portal'] == portal]
        return [deepcopy(r) for r in sorted(candidates, key=lambda r: (-len(terms & set(r['text'].lower().split())), r['factId'])) if terms & set(r['text'].lower().split())][:10]

    async def enqueue(self, user_id, *, key, kind, decision):
        if kind not in ('greetings', 'checkIns') or not key or len(key) > 300:
            raise ValueError('invalid_notification')
        # Store no bearer tokens or raw session IDs.
        digest = sha256(key.encode()).hexdigest()
        def operation(state):
            existing = next((e for e in state['events'] if e['key'] == digest and e['kind'] == kind), None)
            if existing:
                return {'queued': False, 'reason': 'duplicate', 'event': existing}
            if not decision['allowed']:
                return {'queued': False, 'reason': decision['reason']}
            if len(state['events']) >= 1000:
                return {'queued': False, 'reason': 'notification_capacity_reached'}
            event = {'key': digest, 'kind': kind, 'state': 'pending', 'createdAt': datetime.now(timezone.utc).isoformat()}
            state['events'].append(event)
            return {'queued': True, 'event': event, 'delivered': False}
        return await self._change(user_id, operation)
