from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException

from guardian_control import ApprovalInput, ClosedModel, GrantInput, PlanInput, SafeModeInput
from guardian_control_store import GuardianControlStore


class MemoryDecision(ClosedModel):
    retain: bool


def build_guardian_control_router(*, db: Any, get_current_user: Any, rate_limit=None):
    router = APIRouter(prefix="/guardian/control", tags=["guardian-control"])
    store = GuardianControlStore(db.guardian_control_state)

    async def subject(authorization, *, emergency=False):
        user = await get_current_user(authorization)
        if rate_limit and not emergency:
            rate_limit("guardian-control:" + user["user_id"], 120, 60)
        return user["user_id"]

    async def change(owner, method, *args):
        try:
            return await store.mutate(owner, method, *args)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc).strip("'")) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    @router.get("/status")
    async def status(authorization: Optional[str] = Header(None)):
        return await store.status(await subject(authorization))

    # Owner endpoints are not registered as Guardian/model tools. All grants are
    # SIMULATED; even a stolen session cannot enable a real connector here.
    @router.post("/grants")
    async def grant(body: GrantInput, authorization: Optional[str] = Header(None)):
        return await change(await subject(authorization), "grant", body)

    @router.post("/grants/{grant_id}/revoke")
    async def revoke(grant_id: str, authorization: Optional[str] = Header(None)):
        return await change(await subject(authorization), "revoke", grant_id)

    @router.post("/safe-mode")
    async def safe_mode(body: SafeModeInput, authorization: Optional[str] = Header(None)):
        return await change(await subject(authorization, emergency=body.enabled), "safe_mode", body)

    @router.post("/runs")
    async def plan(body: PlanInput, authorization: Optional[str] = Header(None)):
        return await change(await subject(authorization), "plan", body)

    @router.get("/runs/{run_id}/context")
    async def context(run_id: str, authorization: Optional[str] = Header(None)):
        return await change(await subject(authorization), "context", run_id)

    @router.post("/runs/{run_id}/approve")
    async def approve(run_id: str, body: ApprovalInput, authorization: Optional[str] = Header(None)):
        return await change(await subject(authorization), "approve", run_id, body)

    @router.post("/runs/{run_id}/advance")
    async def advance(run_id: str, authorization: Optional[str] = Header(None)):
        return await change(await subject(authorization), "advance", run_id)

    @router.post("/runs/{run_id}/verify")
    async def verify(run_id: str, authorization: Optional[str] = Header(None)):
        return await change(await subject(authorization), "verify", run_id)

    @router.post("/runs/{run_id}/cancel")
    async def cancel(run_id: str, authorization: Optional[str] = Header(None)):
        return await change(await subject(authorization), "cancel", run_id)

    @router.post("/memory/{proposal_id}/resolve")
    async def resolve(proposal_id: str, body: MemoryDecision, authorization: Optional[str] = Header(None)):
        return await change(await subject(authorization), "resolve_memory", proposal_id, body.retain)

    return router
