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
        if portal is not None and (portal not in PORTALS or portal not in current.get('portals_enabled', [])):
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
        state = await memory().snapshot(current['user_id'])
        for record in state['records']:
            if record['factId'] == fact_id:
                await user(authorization, record['portal'])
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
            key = 'greeting:' + sha256((authorization or '').encode()).hexdigest()
        else:
            if not body.event_id:
                raise HTTPException(422, 'event_id_required')
            key = 'check-in:' + body.event_id
        return await memory().enqueue(current['user_id'], key=key, kind=body.kind, decision=decision)

    @router.get('/notifications')
    async def inbox(authorization: Optional[str] = Header(None)):
        current = await user(authorization)
        state = await memory().snapshot(current['user_id'])
        return {'events': state['events'], 'delivery': 'inbox-only'}

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
