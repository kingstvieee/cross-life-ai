from typing import Any, Dict, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from guardian_store import GuardianStore


class GuardianMissionUpdate(BaseModel):
    patch: Dict[str, Any] = Field(default_factory=dict)
    ledger_state: Optional[str] = None
    summary: Optional[str] = None
    evidence: Any = None


class GuardianPrivateModeUpdate(BaseModel):
    enabled: bool


class GuardianLeaseRequest(BaseModel):
    owner: str = Field(min_length=1)
    fence: int = Field(ge=0)


class GuardianCheckpointRequest(GuardianLeaseRequest):
    checkpoint_id: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    idempotency_key: str = Field(min_length=1)


class GuardianCancelRequest(GuardianLeaseRequest):
    reason: str = Field(min_length=1)


class GuardianReconcileRequest(BaseModel):
    idempotency_key: str = Field(min_length=1)
    outcome: str
    evidence: Dict[str, Any] = Field(default_factory=dict)


def build_guardian_router(*, db: Any, get_current_user: Any) -> APIRouter:
    """Build authenticated Guardian Core routes against the app's Mongo database.

    The router deliberately exposes no unauthenticated or cross-user access. All
    state is scoped from the authenticated session's user_id rather than request
    parameters, preventing a caller from selecting another user's Guardian state.
    """

    router = APIRouter(prefix="/guardian/core", tags=["guardian-core"])
    store = GuardianStore(db.guardian_core_state)

    async def current_user(authorization: Optional[str]) -> Dict[str, Any]:
        return await get_current_user(authorization)

    @router.get("/briefing")
    async def briefing(authorization: Optional[str] = Header(None)):
        user = await current_user(authorization)
        return await store.briefing(user["user_id"])

    @router.get("/missions")
    async def missions(
        portal: Optional[str] = None,
        status: Optional[str] = None,
        authorization: Optional[str] = Header(None),
    ):
        user = await current_user(authorization)
        try:
            return {
                "missions": await store.list_missions(
                    user["user_id"], portal=portal, status=status
                )
            }
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @router.get("/missions/{mission_id}")
    async def mission(
        mission_id: str,
        authorization: Optional[str] = Header(None),
    ):
        user = await current_user(authorization)
        item = await store.get_mission(user["user_id"], mission_id)
        if not item:
            raise HTTPException(status_code=404, detail="mission_not_found")
        return item

    @router.patch("/missions/{mission_id}")
    async def update_mission(
        mission_id: str,
        body: GuardianMissionUpdate,
        authorization: Optional[str] = Header(None),
    ):
        user = await current_user(authorization)

        # Guardian may organize and update its own mission registry, but a mission
        # cannot bypass GuardianCore's evidence gate for completed status.
        if "id" in body.patch:
            raise HTTPException(status_code=400, detail="mission_id_is_immutable")
        if "user_id" in body.patch or "userId" in body.patch:
            raise HTTPException(status_code=400, detail="user_scope_is_immutable")

        try:
            return await store.update_mission(
                user["user_id"],
                mission_id,
                body.patch,
                ledger_state=body.ledger_state,
                summary=body.summary,
                evidence=body.evidence,
            )
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="mission_not_found") from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail="guardian_state_conflict") from exc

    @router.post("/private-mode")
    async def private_mode(
        body: GuardianPrivateModeUpdate,
        authorization: Optional[str] = Header(None),
    ):
        user = await current_user(authorization)
        try:
            return await store.set_private_mode(user["user_id"], body.enabled)
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail="guardian_state_conflict") from exc

    @router.get("/workflows/{workflow_id}")
    async def workflow(workflow_id: str, authorization: Optional[str] = Header(None)):
        user = await current_user(authorization)
        try:
            return await store.get_workflow(user["user_id"], workflow_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="workflow_not_found") from exc

    @router.post("/workflows/{workflow_id}/lease")
    async def workflow_lease(workflow_id: str, body: GuardianLeaseRequest, authorization: Optional[str] = Header(None)):
        user = await current_user(authorization)
        try:
            return await store.claim_workflow_lease(user["user_id"], workflow_id, owner=body.owner, fence=body.fence)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="workflow_not_found") from exc
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail="guardian_state_conflict") from exc

    @router.post("/workflows/{workflow_id}/checkpoints")
    async def workflow_checkpoint(workflow_id: str, body: GuardianCheckpointRequest, authorization: Optional[str] = Header(None)):
        user = await current_user(authorization)
        try:
            return await store.record_workflow_checkpoint(user["user_id"], workflow_id, owner=body.owner, fence=body.fence, checkpoint_id=body.checkpoint_id, summary=body.summary, idempotency_key=body.idempotency_key)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="workflow_not_found") from exc
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail="guardian_state_conflict") from exc

    @router.post("/workflows/{workflow_id}/cancel")
    async def workflow_cancel(workflow_id: str, body: GuardianCancelRequest, authorization: Optional[str] = Header(None)):
        user = await current_user(authorization)
        try:
            return await store.cancel_workflow(user["user_id"], workflow_id, owner=body.owner, fence=body.fence, reason=body.reason)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="workflow_not_found") from exc
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail="guardian_state_conflict") from exc

    @router.post("/workflows/{workflow_id}/reconcile")
    async def workflow_reconcile(workflow_id: str, body: GuardianReconcileRequest, authorization: Optional[str] = Header(None)):
        user = await current_user(authorization)
        try:
            return await store.reconcile_workflow(user["user_id"], workflow_id, idempotency_key=body.idempotency_key, outcome=body.outcome, evidence=body.evidence)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="workflow_not_found") from exc
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail="guardian_state_conflict") from exc

    return router
