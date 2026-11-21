"""Authenticated Guardian cognition endpoints.

Mount with app.include_router(build_cognition_router(db=db,
get_current_user=get_current_user, get_trusted_worker=get_trusted_worker)).
The trusted worker callback is mandatory for verified events.
"""
from typing import Any, Dict, Optional
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field
from guardian_cognition_store import GuardianCognitionStore


class CognitionEvent(BaseModel):
    type: str = Field(min_length=1)
    portal: Optional[str] = None
    speechId: Optional[str] = None
    taskId: Optional[str] = None
    until: Optional[str] = None


class TrustedUpdate(BaseModel):
    taskId: str = Field(min_length=1)
    evidence: Dict[str, Any] = Field(min_length=1)


def build_cognition_router(*, db, get_current_user, get_trusted_worker=None):
    router = APIRouter(prefix="/guardian/cognition", tags=["guardian-cognition"])
    store = GuardianCognitionStore(db.guardian_cognition_state)

    async def account(auth):
        user = await get_current_user(auth)
        if user.get("is_demo"):
            raise HTTPException(status_code=403, detail="demo_guest_read_only")
        return user["user_id"]

    @router.get("/state")
    async def read_state(authorization: Optional[str] = Header(None)):
        return {"state": await store.read(await account(authorization))}

    @router.post("/event")
    async def event(payload: CognitionEvent, authorization: Optional[str] = Header(None)):
        user_id = await account(authorization)
        try:
            return await store.apply(user_id, payload.model_dump(exclude_none=True))
        except (ValueError, PermissionError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    @router.post("/trusted-update")
    async def verified_update(
        payload: TrustedUpdate,
        authorization: Optional[str] = Header(None),
        x_guardian_worker_token: Optional[str] = Header(None),
    ):
        user_id = await account(authorization)
        if get_trusted_worker is None:
            raise HTTPException(status_code=403, detail="trusted_worker_not_configured")
        await get_trusted_worker(x_guardian_worker_token)
        try:
            return await store.apply(
                user_id,
                {"type": "VERIFIED_UPDATE", "taskId": payload.taskId,
                 "evidence": payload.evidence},
                trusted=True)
        except (ValueError, PermissionError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    return router
