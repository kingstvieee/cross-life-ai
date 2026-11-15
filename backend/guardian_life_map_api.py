from hashlib import sha256
import asyncio
import os
from guardian_poppy import discover
from datetime import datetime, timezone
from typing import Literal, Optional
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field
from guardian_life_map import LifeMapStore, PORTALS
from guardian_store import GuardianStore


class MemoryInput(BaseModel):
    fact_id: str = Field(min_length=1, max_length=200)
    portal: str
    text: str = Field(min_length=1, max_length=8000)
    source_id: str = Field(min_length=1, max_length=200)
    source_span: str = Field(min_length=1, max_length=8000)
    expected_revision: int = Field(default=0, ge=0)


class DeliveryReceipt(BaseModel):
    token: str = Field(min_length=20, max_length=256)
    outcome: Literal['played', 'failed']


class NotificationInput(BaseModel):
    kind: Literal['greetings', 'checkIns']
    event_id: str = Field(default='', max_length=200)


def life_map_router(*, db, get_current_user):
    router = APIRouter(prefix='/guardian/life-map', tags=['guardian-life-map'])
    # Lazy collection access keeps legacy router construction backwards compatible.
    def memory():
        return LifeMapStore(db.guardian_life_map)

    async def user(header, portal=None):
        current = await get_current_user(header)
        if current.get('is_demo'):
            raise HTTPException(403, 'demo_guest_read_only')
        if portal is not None and (portal not in PORTALS or portal not in current.get('portals_enabled', []) or current.get('portal_privacy', {}).get(portal, {}).get('access') is False):
            raise HTTPException(403, 'portal_access_denied')
        return current

    @router.put('/records')
    async def save(body: MemoryInput, authorization: Optional[str] = Header(None)):
        current = await user(authorization, body.portal)
        # Caller cannot move or erase a record owned by a disabled portal.
        state = await memory().snapshot(current['user_id'])
        for record in state['records']:
            if record['factId'] == body.fact_id:
                await user(authorization, record['portal'])
        try:
            return await memory().save(current['user_id'], **body.model_dump())
        except ValueError as exc:
            raise HTTPException(409, str(exc)) from exc

    @router.get('/records')
    async def recall(portal: str, query: str = '', authorization: Optional[str] = Header(None)):
        current = await user(authorization, portal)
        return {'records': await memory().recall(current['user_id'], portal=portal, query=query)}

    @router.delete('/records/{fact_id}')
    async def delete(fact_id: str, authorization: Optional[str] = Header(None)):
        current = await user(authorization)
        return await memory().delete(current['user_id'], fact_id)

    @router.post('/notifications')
    async def enqueue(body: NotificationInput, authorization: Optional[str] = Header(None)):
        current = await user(authorization)
        core = GuardianStore(db.guardian_core_state)
        state = await core.ensure_user(current['user_id'])
        if state.get('private_mode'):
            return {'queued': False, 'reason': 'private_mode'}
        decision = await core.proactive_decision(current['user_id'], 'rsf-fabric-sourcing', kind=body.kind, at=datetime.now(timezone.utc))
        if body.kind == 'greetings':
            key = 'greeting:' + sha256((authorization or '').encode()).hexdigest() + ':' + body.event_id
        else:
            if not body.event_id:
                raise HTTPException(422, 'event_id_required')
            key = 'check-in:' + body.event_id
        return await memory().enqueue(current['user_id'], key=key, kind=body.kind, decision=decision)

    @router.get('/notifications')
    async def inbox(authorization: Optional[str] = Header(None)):
        current = await user(authorization)
        state = await memory().snapshot(current['user_id'])
        return {'events': [{k:v for k,v in e.items() if k != 'deliveryTokenHash'} for e in state['events']], 'delivery': 'client-playback-reports'}

    @router.get('/overview')
    async def overview(authorization: Optional[str] = Header(None)):
        current = await user(authorization)
        state = await GuardianStore(db.guardian_core_state).ensure_user(current['user_id'])
        from guardian_workflow import view
        workflow = view(state.get('workflows', {}).get('rsf-fabric-sourcing'), 'rsf-fabric-sourcing')
        return {'privateMode': bool(state.get('private_mode')), 'workflow': workflow, 'consent': state['workflows']['rsf-fabric-sourcing'].get('proactiveConsent', {}), 'speechQuiet': state['workflows']['rsf-fabric-sourcing']['channels']['speech'].get('quiet', False),
                'voiceConfigured': bool(os.environ.get('OPENAI_API_KEY')),
                'workerConfigured': bool(os.environ.get('GUARDIAN_WORKER_TOKEN'))}

    @router.post('/notifications/{key}/claim')
    async def claim(key: str, authorization: Optional[str] = Header(None)):
        current = await user(authorization)
        state = await GuardianStore(db.guardian_core_state).ensure_user(current['user_id'])
        snapshot = await memory().snapshot(current['user_id'])
        event = next((e for e in snapshot['events'] if e['key'] == key), None)
        if not event:
            raise HTTPException(404, 'notification_not_found')
        if state.get('private_mode') or current.get('cross_life_paused'):
            decision = {'allowed': False, 'reason': 'private_or_paused'}
        else:
            decision = await GuardianStore(db.guardian_core_state).proactive_decision(current['user_id'], 'rsf-fabric-sourcing', kind=event['kind'], at=datetime.now(timezone.utc))
        return await memory().claim_notification(current['user_id'], key, decision)

    @router.post('/notifications/{key}/receipt')
    async def receipt(key: str, body: DeliveryReceipt, authorization: Optional[str] = Header(None)):
        current = await user(authorization)
        try:
            return await memory().finish_notification(current['user_id'], key, body.token, body.outcome)
        except ValueError as exc:
            raise HTTPException(409, str(exc)) from exc

    @router.post('/notifications/{key}/retry')
    async def retry(key: str, authorization: Optional[str] = Header(None)):
        current = await user(authorization)
        try:
            return await memory().retry_notification(current['user_id'], key)
        except ValueError as exc:
            raise HTTPException(409, str(exc)) from exc

    @router.get('/poppy/discovery')
    async def poppy_discovery(host: str, authorization: Optional[str] = Header(None)):
        await user(authorization)
        allowed = [h.strip() for h in os.environ.get('GUARDIAN_POPPY_DISCOVERY_HOSTS', '').split(',') if h.strip()]
        try:
            return await asyncio.to_thread(discover, host, allowed_hosts=allowed)
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
        except (OSError, RuntimeError) as exc:
            raise HTTPException(502, 'company_discovery_unavailable') from exc

    return router
