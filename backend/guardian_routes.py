from datetime import datetime
import hmac
import os
from typing import Any, Dict, List, Optional

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
    authority: Optional[Dict[str, Any]] = None


class GuardianRetryRequest(GuardianLeaseRequest):
    error: str = Field(min_length=1)


class GuardianSpeechRequest(BaseModel):
    quiet: bool


class GuardianConsentRequest(BaseModel):
    greetings: bool = False
    check_ins: bool = False


class GuardianProactiveRequest(BaseModel):
    kind: str
    at: datetime


class GuardianDispatchRequest(GuardianLeaseRequest):
    action: str = Field(min_length=1)
    action_version: str = Field(min_length=1)
    action_hash: str = Field(min_length=1)
    authority: Dict[str, Any]
    context: Dict[str, Any] = Field(default_factory=dict)
    idempotency_key: str = Field(min_length=1)


class GuardianSentRequest(BaseModel):
    idempotency_key: str = Field(min_length=1)


class GuardianOperationCancelRequest(BaseModel):
    idempotency_key: str = Field(min_length=1)
    reason: str = Field(min_length=1)


class GuardianProviderEventRequest(BaseModel):
    event_id: str = Field(min_length=1)
    idempotency_key: str = Field(min_length=1)
    outcome: str
    receipt: Dict[str, Any] = Field(default_factory=dict)


class GuardianContributionRequest(BaseModel):
    contribution_id: str = Field(min_length=1)
    portal_id: str
    kind: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    version: str = Field(min_length=1)
    privacy_scope: str = Field(min_length=1)
    authority_scopes: List[str] = Field(default_factory=list)
    idempotency_key: str = Field(min_length=1)


class GuardianRenderRequest(BaseModel):
    requested_text: Optional[str] = None


def build_guardian_router(*, db: Any, get_current_user: Any, get_trusted_worker: Any = None) -> APIRouter:
    """Build authenticated Guardian Core routes against the app's Mongo database.

    The router deliberately exposes no unauthenticated or cross-user access. All
    state is scoped from the authenticated session's user_id rather than request
    parameters, preventing a caller from selecting another user's Guardian state.
    """

    router = APIRouter(prefix="/guardian/core", tags=["guardian-core"])
    store = GuardianStore(db.guardian_core_state)

    async def current_user(authorization: Optional[str]) -> Dict[str, Any]:
        return await get_current_user(authorization)

    async def account_user(authorization: Optional[str]) -> Dict[str, Any]:
        user = await current_user(authorization)
        if user.get("is_demo"):
            raise HTTPException(status_code=403, detail="demo_guest_read_only")
        return user

    async def trusted_worker(token: Optional[str]) -> Dict[str, Any]:
        if get_trusted_worker is not None:
            return await get_trusted_worker(token)
        expected = os.environ.get("GUARDIAN_WORKER_TOKEN", "")
        if not expected or not token or not hmac.compare_digest(token, expected):
            raise HTTPException(status_code=403, detail="trusted_worker_required")
        return {"workerId": "configured-guardian-worker"}

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
        user = await account_user(authorization)

        # Guardian may organize and update its own mission registry, but a mission
        # cannot bypass GuardianCore's evidence gate for completed status.
        if "id" in body.patch:
            raise HTTPException(status_code=400, detail="mission_id_is_immutable")
        if "user_id" in body.patch or "userId" in body.patch:
            raise HTTPException(status_code=400, detail="user_scope_is_immutable")
        if body.patch.get("status") == "completed":
            raise HTTPException(status_code=400, detail="completion_is_server_owned")

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
        user = await account_user(authorization)
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
    async def workflow_lease(workflow_id: str, body: GuardianLeaseRequest, authorization: Optional[str] = Header(None), x_guardian_worker_token: Optional[str] = Header(None)):
        user = await account_user(authorization)
        await trusted_worker(x_guardian_worker_token)
        try:
            return await store.claim_workflow_lease(user["user_id"], workflow_id, owner=body.owner, fence=body.fence)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="workflow_not_found") from exc
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail="guardian_state_conflict") from exc

    @router.post("/workflows/{workflow_id}/checkpoints")
    async def workflow_checkpoint(workflow_id: str, body: GuardianCheckpointRequest, authorization: Optional[str] = Header(None), x_guardian_worker_token: Optional[str] = Header(None)):
        user = await account_user(authorization)
        await trusted_worker(x_guardian_worker_token)
        try:
            return await store.record_workflow_checkpoint(user["user_id"], workflow_id, owner=body.owner, fence=body.fence, checkpoint_id=body.checkpoint_id, summary=body.summary, idempotency_key=body.idempotency_key)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="workflow_not_found") from exc
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail="guardian_state_conflict") from exc

    @router.post("/workflows/{workflow_id}/cancel")
    async def workflow_cancel(workflow_id: str, body: GuardianCancelRequest, authorization: Optional[str] = Header(None), x_guardian_worker_token: Optional[str] = Header(None)):
        user = await account_user(authorization)
        await trusted_worker(x_guardian_worker_token)
        try:
            return await store.cancel_workflow(user["user_id"], workflow_id, owner=body.owner, fence=body.fence, reason=body.reason)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="workflow_not_found") from exc
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail="guardian_state_conflict") from exc

    @router.post("/workflows/{workflow_id}/reconcile")
    async def workflow_reconcile(workflow_id: str, body: GuardianReconcileRequest, authorization: Optional[str] = Header(None), x_guardian_worker_token: Optional[str] = Header(None)):
        user = await account_user(authorization)
        await trusted_worker(x_guardian_worker_token)
        try:
            return await store.reconcile_workflow_with_authority(user["user_id"], workflow_id, authority=body.authority, idempotency_key=body.idempotency_key, outcome=body.outcome, evidence=body.evidence)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="workflow_not_found") from exc
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail="guardian_state_conflict") from exc

    @router.post("/workflows/{workflow_id}/retry")
    async def workflow_retry(workflow_id: str, body: GuardianRetryRequest, authorization: Optional[str] = Header(None), x_guardian_worker_token: Optional[str] = Header(None)):
        user = await account_user(authorization)
        await trusted_worker(x_guardian_worker_token)
        try:
            return await store.retry_workflow(user["user_id"], workflow_id, owner=body.owner, fence=body.fence, error=body.error)
        except (KeyError, ValueError) as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    @router.post("/workflows/{workflow_id}/recover")
    async def workflow_recover(workflow_id: str, body: GuardianLeaseRequest, authorization: Optional[str] = Header(None), x_guardian_worker_token: Optional[str] = Header(None)):
        user = await account_user(authorization)
        await trusted_worker(x_guardian_worker_token)
        try:
            return await store.recover_workflow(user["user_id"], workflow_id, owner=body.owner, fence=body.fence)
        except (KeyError, ValueError) as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    @router.post("/workflows/{workflow_id}/speech")
    async def workflow_speech(workflow_id: str, body: GuardianSpeechRequest, authorization: Optional[str] = Header(None)):
        user = await account_user(authorization)
        return await store.set_speech_quiet(user["user_id"], workflow_id, quiet=body.quiet)

    @router.post("/workflows/{workflow_id}/render")
    async def workflow_render(workflow_id: str, body: GuardianRenderRequest, authorization: Optional[str] = Header(None)):
        user = await current_user(authorization)
        try:
            return await store.render_workflow_status(user["user_id"], workflow_id, requested_text=body.requested_text)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="workflow_not_found") from exc

    @router.post("/workflows/{workflow_id}/proactive-consent")
    async def workflow_proactive_consent(workflow_id: str, body: GuardianConsentRequest, authorization: Optional[str] = Header(None)):
        user = await account_user(authorization)
        return await store.set_proactive_consent(user["user_id"], workflow_id, greetings=body.greetings, check_ins=body.check_ins)

    @router.post("/workflows/{workflow_id}/proactive-decision")
    async def workflow_proactive_decision(workflow_id: str, body: GuardianProactiveRequest, authorization: Optional[str] = Header(None)):
        user = await current_user(authorization)
        try:
            return await store.proactive_decision(user["user_id"], workflow_id, kind=body.kind, at=body.at)
        except (KeyError, ValueError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @router.post("/workflows/{workflow_id}/authority/revoke")
    async def workflow_revoke_authority(workflow_id: str, body: Dict[str, Any], authorization: Optional[str] = Header(None)):
        user = await account_user(authorization)
        return await store.revoke_workflow_authority(user["user_id"], workflow_id, reason=str(body.get("reason", "revoked")))

    @router.post("/workflows/{workflow_id}/dispatch")
    async def workflow_dispatch(workflow_id: str, body: GuardianDispatchRequest, authorization: Optional[str] = Header(None), x_guardian_worker_token: Optional[str] = Header(None)):
        user = await account_user(authorization)
        await trusted_worker(x_guardian_worker_token)
        try:
            return await store.dispatch_workflow(user["user_id"], workflow_id, owner=body.owner, fence=body.fence, action=body.action, action_version=body.action_version, action_hash=body.action_hash, authority=body.authority, context=body.context, idempotency_key=body.idempotency_key)
        except (KeyError, ValueError) as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    @router.post("/workflows/{workflow_id}/sent")
    async def workflow_sent(workflow_id: str, body: GuardianSentRequest, authorization: Optional[str] = Header(None), x_guardian_worker_token: Optional[str] = Header(None)):
        user = await account_user(authorization)
        await trusted_worker(x_guardian_worker_token)
        try:
            return await store.mark_workflow_sent(user["user_id"], workflow_id, idempotency_key=body.idempotency_key)
        except (KeyError, ValueError) as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    @router.post("/workflows/{workflow_id}/operation-cancel")
    async def workflow_operation_cancel(workflow_id: str, body: GuardianOperationCancelRequest, authorization: Optional[str] = Header(None), x_guardian_worker_token: Optional[str] = Header(None)):
        user = await account_user(authorization)
        await trusted_worker(x_guardian_worker_token)
        try:
            return await store.request_operation_cancellation(user["user_id"], workflow_id, idempotency_key=body.idempotency_key, reason=body.reason)
        except (KeyError, ValueError) as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    @router.post("/workflows/{workflow_id}/provider-event")
    async def workflow_provider_event(workflow_id: str, body: GuardianProviderEventRequest, authorization: Optional[str] = Header(None), x_guardian_worker_token: Optional[str] = Header(None)):
        user = await account_user(authorization)
        await trusted_worker(x_guardian_worker_token)
        try:
            return await store.record_provider_event(user["user_id"], workflow_id, event_id=body.event_id, idempotency_key=body.idempotency_key, outcome=body.outcome, receipt=body.receipt)
        except (KeyError, ValueError) as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    @router.post("/workflows/{workflow_id}/portal-weave/contributions")
    async def workflow_contribution(workflow_id: str, body: GuardianContributionRequest, authorization: Optional[str] = Header(None)):
        user = await account_user(authorization)
        try:
            return await store.add_portal_contribution(user["user_id"], workflow_id, contribution_id=body.contribution_id, portal_id=body.portal_id, kind=body.kind, summary=body.summary, version=body.version, privacy_scope=body.privacy_scope, authority_scopes=body.authority_scopes, idempotency_key=body.idempotency_key)
        except (KeyError, ValueError) as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    @router.post("/workflows/{workflow_id}/portal-weave/arbitrate")
    async def workflow_arbitrate(workflow_id: str, authorization: Optional[str] = Header(None)):
        user = await account_user(authorization)
        try:
            return await store.arbitrate_portal_weave(user["user_id"], workflow_id)
        except (KeyError, ValueError) as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    return router
