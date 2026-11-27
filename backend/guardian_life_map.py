"""Per-user, revisioned candidate memory. Never an authorization source.

No derived vector cache is persisted: retrieval filters current records first.
Deletion scrubs content and provenance spans from all revisions of the fact.
"""
from copy import deepcopy
from datetime import datetime, timezone
from hashlib import sha256
import json
import re
import secrets
from datetime import timedelta

PORTALS = frozenset(('home', 'work', 'creativity', 'wellbeing', 'relationships', 'community', 'style'))


def _rank_records(state, portals, query):
    terms = set(re.findall(r"\w+", query.casefold()))
    scored = []
    for record in state['records']:
        if record['status'] != 'current' or record['portal'] not in portals:
            continue
        overlap = len(terms.intersection(re.findall(r"\w+", record['text'].casefold())))
        if overlap or not terms:
            scored.append((-overlap, record['factId'], record))
    scored.sort(key=lambda item: item[:2])
    return [deepcopy(record) for _, _, record in scored]


def _notification_expired(event, at):
    lifetime = timedelta(minutes=10 if event['kind'] == 'greetings' else 60)
    return datetime.fromisoformat(event['createdAt']) + lifetime <= at


class LifeMapStore:
    def __init__(self, collection):
        self.collection = collection

    async def snapshot(self, user_id):
        if not user_id:
            raise ValueError('user_required')
        await self.collection.update_one({'user_id': user_id}, {'$setOnInsert': {'user_id': user_id, 'version': 0, 'memoryVersion': 0, 'records': [], 'events': []}}, upsert=True)
        return await self.collection.find_one({'user_id': user_id}, {'_id': 0})

    async def _change(self, user_id, operation):
        for _ in range(5):
            state = await self.snapshot(user_id)
            version = state['version']
            result = operation(state)
            if len(json.dumps(state, ensure_ascii=False).encode('utf-8')) > 8 * 1024 * 1024:
                raise ValueError('life_map_byte_capacity_reached')
            written = await self.collection.update_one({'user_id': user_id, 'version': version}, {'$set': {'records': state['records'], 'events': state['events'], 'memoryVersion': state.get('memoryVersion', 0)}, '$inc': {'version': 1}})
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
            state['memoryVersion'] = state.get('memoryVersion', 0) + 1
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
            if found:
                state['memoryVersion'] = state.get('memoryVersion', 0) + 1
            return {'deleted': found, 'scope': 'life-map-records-and-retrieval', 'externalCopiesDeleted': False}
        return await self._change(user_id, operation)

    async def recall(self, user_id, *, portal, query):
        if portal not in PORTALS:
            raise ValueError('invalid_portal')
        state = await self.snapshot(user_id)
        return _rank_records(state, {portal}, query)[:50]

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


    async def claim_notification(self, user_id, key, decision, at=None):
        at = at or datetime.now(timezone.utc)
        token = secrets.token_urlsafe(32)
        def operation(state):
            event = next((e for e in state['events'] if e['key'] == key), None)
            if not event:
                raise ValueError('notification_not_found')
            if not decision['allowed']:
                return {'claimed': False, 'reason': decision['reason']}
            if event['state'] == 'claimed' and datetime.fromisoformat(event['claimUntil']) <= at:
                event['state'] = 'uncertain'
            if event['state'] == 'pending' and _notification_expired(event, at):
                event['state'] = 'expired'
            if event['state'] != 'pending':
                return {'claimed': False, 'reason': event['state']}
            recent_cutoff = at - timedelta(hours=1)
            if any(other is not event and other['kind'] == event['kind']
                   and other.get('lastClaimedAt')
                   and datetime.fromisoformat(other['lastClaimedAt']) > recent_cutoff
                   for other in state['events']):
                return {'claimed': False, 'reason': 'interruption_budget'}
            event.update(state='claimed', lastClaimedAt=at.isoformat(), claimUntil=(at + timedelta(seconds=60)).isoformat(), deliveryTokenHash=sha256(token.encode()).hexdigest())
            return {'claimed': True, 'token': token, 'kind': event['kind'], 'key': key}
        return await self._change(user_id, operation)

    async def notifications(self, user_id, at=None):
        at = at or datetime.now(timezone.utc)
        def operation(state):
            for event in state['events']:
                if event['state'] == 'claimed' and datetime.fromisoformat(event['claimUntil']) <= at:
                    event['state'] = 'uncertain'
                if event['state'] == 'pending' and _notification_expired(event, at):
                    event['state'] = 'expired'
            return state['events']
        return await self._change(user_id, operation)

    async def finish_notification(self, user_id, key, token, outcome):
        if outcome not in ('played', 'failed'):
            raise ValueError('invalid_delivery_outcome')
        def operation(state):
            event = next((e for e in state['events'] if e['key'] == key), None)
            if not event or event.get('deliveryTokenHash') != sha256(token.encode()).hexdigest():
                raise ValueError('invalid_delivery_receipt')
            if event['state'] not in ('claimed', 'uncertain', outcome):
                raise ValueError('delivery_state_conflict')
            event.update(state=outcome, reportedAt=datetime.now(timezone.utc).isoformat(), evidence='client-playback-report')
            return {'state': outcome, 'evidence': 'client-playback-report'}
        return await self._change(user_id, operation)

    async def retry_notification(self, user_id, key):
        def operation(state):
            event = next((e for e in state['events'] if e['key'] == key), None)
            if not event or event['state'] not in ('failed', 'uncertain'):
                raise ValueError('notification_not_retryable')
            if _notification_expired(event, datetime.now(timezone.utc)):
                raise ValueError('notification_expired')
            if event.get('retries', 0) >= 3:
                raise ValueError('notification_retry_limit')
            event.update(state='pending', retries=event.get('retries', 0) + 1, retryAt=datetime.now(timezone.utc).isoformat())
            event.pop('deliveryTokenHash', None)
            return {'state': 'pending'}
        return await self._change(user_id, operation)


    async def context(self, user, query, portal=None):
        if user.get('is_demo') or user.get('cross_life_paused') or user.get('_guardian_private'):
            return []
        allowed = [p for p in PORTALS if p in user.get('portals_enabled', []) and user.get('portal_privacy', {}).get(p, {}).get('access') is True and (p == portal or user.get('portal_privacy', {}).get(p, {}).get('share') is True)]
        if not allowed:
            return []
        state = await self.snapshot(user['user_id'])
        expected_version = user.get('_life_map_revision')
        if expected_version is not None and state.get('memoryVersion', 0) != expected_version:
            return []
        records = _rank_records(state, set(allowed), query)
        fields = ('factId', 'revision', 'portal', 'text', 'sourceId', 'sourceSpan', 'evidenceStatus')
        return [{key: record[key] for key in fields} for record in records[:12]]
