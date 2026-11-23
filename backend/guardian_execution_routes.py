"""Authenticated Guardian execution backed by shared MongoDB receipts.

The initial operation is read-only portal.list. All actor identity and scopes
are server-derived. No write-capable or third-party adapters are enabled.
"""
import hashlib
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError
from guardian_github_adapter import read_repository_with_readback, GitHubAdapterError, permitted_actor, configured_repo


class ExecuteRequest(BaseModel):
    request_id: str = Field(min_length=8, max_length=128, pattern=r"^[A-Za-z0-9_-]+$")
    tool: str
    arguments: dict = Field(default_factory=dict)


def _fingerprint(actor, tool, args):
    payload = json.dumps([actor, tool, args], sort_keys=True, separators=(",", ":"),
                         allow_nan=False)
    return hashlib.sha256(payload.encode()).hexdigest()


async def ensure_guardian_execution_indexes(db):
    await db.guardian_tool_executions.create_index("request_id", unique=True)
    await db.guardian_tool_executions.create_index([("actor_id", 1), ("created_at", -1)])


def build_guardian_execution_router(*, require_account_user, portals, db):
    router = APIRouter(prefix="/guardian/tools", tags=["guardian-tools"])

    @router.post("/execute")
    async def execute(payload: ExecuteRequest, user=Depends(require_account_user)):
        actor = user.get("user_id")
        if not actor or user.get("is_demo"):
            raise HTTPException(403, "authenticated_account_required")
        if payload.tool not in ("portal.list", "github.repository.read"):
            raise HTTPException(403, "tool_not_enabled")
        if payload.arguments:
            raise HTTPException(422, "unsupported_arguments")
        if payload.tool == "github.repository.read" and not permitted_actor(actor):
            raise HTTPException(403, "github_access_denied")
        digest = _fingerprint(actor, payload.tool, payload.arguments)
        now = datetime.now(timezone.utc)
        collection = db.guardian_tool_executions
        claimed = False
        try:
            await collection.insert_one({
                "request_id": payload.request_id, "actor_id": actor,
                "tool": payload.tool, "request_hash": digest,
                "state": "claimed", "created_at": now, "updated_at": now,
            })
            claimed = True
        except DuplicateKeyError:
            pass
        if not claimed:
            prior = await collection.find_one({"request_id": payload.request_id})
            if not prior or prior.get("actor_id") != actor or prior.get("request_hash") != digest:
                raise HTTPException(409, "idempotency_conflict")
            if prior.get("state") == "verified" and prior.get("receipt"):
                return prior["receipt"]
            # A concurrent or interrupted request is never executed twice.
            return {"requestId": payload.request_id, "status": "unknown",
                    "verified": False, "reason": "prior_execution_unresolved"}
        try:
            if payload.tool == "github.repository.read":
                result = await read_repository_with_readback(actor)
                receipt = {"requestId": payload.request_id, "status": "verified",
                           "verified": True, "tool": payload.tool,
                           "result": result, "verificationType": "github_api_second_read"}
                await collection.update_one(
                    {"request_id": payload.request_id, "actor_id": actor, "state": "claimed"},
                    {"$set": {"state": "verified", "receipt": receipt,
                              "updated_at": datetime.now(timezone.utc)}})
                return receipt
            enabled = set(user.get("portals_enabled") or [])
            privacy = user.get("portal_privacy") or {}
            paused = bool(user.get("cross_life_paused"))
            visible = [dict(p) for p in portals if not paused and p["id"] in enabled
                       and (privacy.get(p["id"]) or {}).get("access") is True]
            # Read back from the same canonical server registry, independently
            # of the constructed response. This is NOT external-provider readback.
            canonical_ids = {p["id"] for p in portals}
            verified = all(p["id"] in canonical_ids for p in visible)
            receipt = {
                "requestId": payload.request_id, "status": "verified" if verified else "readback_failed",
                "verified": verified, "tool": payload.tool, "result": {"portals": visible},
                "verificationType": "server_registry",
            }
            await collection.update_one(
                {"request_id": payload.request_id, "actor_id": actor, "state": "claimed"},
                {"$set": {"state": receipt["status"], "receipt": receipt,
                          "updated_at": datetime.now(timezone.utc)}})
            return receipt
        except (GitHubAdapterError, PermissionError) as exc:
            await collection.update_one(
                {"request_id": payload.request_id, "actor_id": actor, "state": "claimed"},
                {"$set": {"state": "failed", "error_code": str(exc),
                          "updated_at": datetime.now(timezone.utc)}})
            raise HTTPException(503, "github_execution_unavailable")
        except Exception:
            # Preserve unresolved state rather than replay an uncertain action.
            raise HTTPException(503, "execution_unresolved")

    return router
