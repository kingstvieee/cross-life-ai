"""Server-side bridge from durable admission to the existing Guardian router.

Only instantiate behind authenticated middleware. Actor and scopes must be derived
from the validated session, never copied from the client request body.
"""
from backend.guardian_durable_admission import DurableAdmission
from backend.guardian_tool_router import GuardianToolRouter


class DurableGuardianExecutor:
    def __init__(self, router: GuardianToolRouter, store: DurableAdmission):
        self.router = router
        self.store = store

    def execute(self, *, session_actor, session_scopes, request_id, tool,
                arguments, approval_id=None, readback=None):
        if not session_actor or not isinstance(session_scopes, (set, frozenset)):
            raise PermissionError("authenticated_session_required")
        registered = self.router._tools.get(tool)
        if registered is None:
            return {"status": "denied", "reason": "unknown_tool", "verified": False}
        spec, _ = registered
        if spec.required_scope not in session_scopes:
            return {"status": "denied", "reason": "scope_denied", "verified": False}
        if not spec.read_only and not spec.requires_approval:
            raise ValueError("write_tool_requires_approval")
        admitted = self.store.claim(
            request_id=request_id, actor=session_actor, tool=tool,
            arguments=arguments, approval_id=approval_id,
            requires_approval=spec.requires_approval)
        if not admitted["claimed"]:
            if admitted["receipt"] is not None:
                return admitted["receipt"]
            # A crash or concurrent dispatch must not replay a possibly executed write.
            return {"status": "unknown", "reason": "prior_execution_unresolved",
                    "verified": False, "requestId": request_id}
        try:
            receipt = self.router.dispatch(
                request_id=request_id, actor_id=session_actor, tool=tool,
                scopes=set(session_scopes), arguments=arguments,
                approved=spec.requires_approval, readback=readback)
            # Provider acknowledgement without readback is NOT a verified success.
            if receipt["status"] == "provider_reported":
                receipt["status"] = "unknown"
                receipt["reason"] = "readback_required"
            self.store.finish(request_id=request_id, receipt=receipt)
            return receipt
        except BaseException:
            # Claimed but unresolved; deliberately do not replay.
            raise
