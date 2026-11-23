"""Authenticated Guardian read-only execution route.

This initial adapter returns the server-owned portal registry. It is not a
third-party provider integration. Durable admission requires configured storage.
"""
import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from guardian_tool_router import GuardianToolRouter, ToolSpec
from guardian_durable_admission import DurableAdmission
from guardian_durable_executor import DurableGuardianExecutor


class ExecuteRequest(BaseModel):
    request_id: str = Field(min_length=8, max_length=128)
    tool: str
    arguments: dict = Field(default_factory=dict)


def build_guardian_execution_router(*, require_account_user, portals):
    router = APIRouter(prefix="/guardian/tools", tags=["guardian-tools"])
    registry = GuardianToolRouter()
    portal_snapshot = tuple(dict(p) for p in portals)
    registry.register(
        ToolSpec("portal.list", "portal.read", read_only=True),
        lambda args: {"portals": [dict(p) for p in portal_snapshot]} if not args
        else (_ for _ in ()).throw(ValueError("unsupported_arguments")),
    )

    @router.post("/execute")
    async def execute(payload: ExecuteRequest, user=Depends(require_account_user)):
        # Scopes are derived exclusively from authenticated server policy.
        # Do not accept client scopes, actor IDs, or approval flags.
        if payload.tool != "portal.list":
            raise HTTPException(403, "tool_not_enabled")
        if payload.arguments:
            raise HTTPException(422, "unsupported_arguments")
        path = os.environ.get("GUARDIAN_ADMISSION_SQLITE_PATH", "").strip()
        if not path or not Path(path).parent.is_dir():
            raise HTTPException(503, "durable_admission_not_configured")
        actor = user.get("user_id")
        if not actor or user.get("is_demo"):
            raise HTTPException(403, "authenticated_account_required")
        store = DurableAdmission(path)
        executor = DurableGuardianExecutor(registry, store)
        expected = {"portals": [dict(p) for p in portal_snapshot]}
        try:
            return executor.execute(
                session_actor=actor, session_scopes={"portal.read"},
                request_id=payload.request_id, tool=payload.tool,
                arguments=payload.arguments,
                readback=lambda outcome: outcome == expected,
            )
        except ValueError as exc:
            if str(exc) == "idempotency_conflict":
                raise HTTPException(409, "idempotency_conflict")
            raise HTTPException(422, "invalid_execution_request")
        except PermissionError:
            raise HTTPException(403, "permission_denied")

    return router
