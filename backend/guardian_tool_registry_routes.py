"""Authenticated, read-only Guardian tool registry API.

Exposes only registered contracts; no provider side effects or client-provided scopes.
"""
from fastapi import APIRouter, Depends


def build_guardian_tool_registry_router(*, require_account_user):
    router = APIRouter(prefix="/guardian/tools", tags=["guardian-tools"])

    @router.get("/capabilities")
    async def capabilities(user=Depends(require_account_user)):
        # Keep tool discovery explicit and fail closed until adapters are installed.
        return {
            "actorId": user["user_id"],
            "executionEnabled": False,
            "capabilities": [],
            "reason": "authenticated_provider_adapters_not_installed",
        }

    return router
