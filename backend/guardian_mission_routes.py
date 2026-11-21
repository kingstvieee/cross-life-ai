"""Authenticated, tenant-scoped Guardian mission inspection API.

Mission proposals are inert until separately approved. Owners can cancel
pending execution. This router exposes no approval, execution, or spend controls.
"""
from datetime import timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import AwareDatetime, BaseModel, Field
from pymongo.errors import DuplicateKeyError
from guardian_mission_engine import MissionConflict, submit_mission, transition

SAFE_FIELDS = {
    "_id": 0, "owner_id": 1, "mission_id": 1, "objective": 1,
    "status": 1, "created_at": 1, "updated_at": 1,
    "not_before": 1, "retry_after": 1, "attempts": 1,
    "recovery_reason": 1, "success_criteria": 1, "budget_cad": 1, "expires_at": 1,
}

MissionStatus = Literal[
    "proposed", "approved", "queued", "leased", "running", "verifying",
    "retry_wait", "awaiting_approval", "completed", "blocked", "cancelled",
]


class MissionProposal(BaseModel):
    objective: str = Field(min_length=1, max_length=2000)
    idempotency_key: str = Field(min_length=8, max_length=128)
    success_criteria: str = Field(min_length=1, max_length=2000)
    budget_cad: float = Field(default=0, ge=0, le=1000000)
    expires_at: AwareDatetime | None = None


def normalize_deadline(mission):
    deadline = mission.get("expires_at")
    if deadline is not None and deadline.tzinfo is None:
        mission["expires_at"] = deadline.replace(tzinfo=timezone.utc)
    return mission


def build_guardian_mission_router(*, db, require_account_user):
    router = APIRouter(prefix="/guardian/missions", tags=["guardian-missions"])

    def owner_id(user):
        value = user.get("user_id")
        if not isinstance(value, str) or not value:
            raise HTTPException(status_code=403, detail="account_identity_required")
        return value

    @router.post("", status_code=201)
    async def propose_mission(
        proposal: MissionProposal, user=Depends(require_account_user),
    ):
        owner = owner_id(user)
        try:
            mission = await submit_mission(
                db.guardian_missions, owner_id=owner,
                objective=proposal.objective,
                idempotency_key=proposal.idempotency_key,
                success_criteria=proposal.success_criteria,
                budget_cad=proposal.budget_cad,
                expires_at=proposal.expires_at,
            )
        except (DuplicateKeyError, MissionConflict):
            raise HTTPException(status_code=409, detail="mission_conflict")
        # Proposal is never queued or executed by this endpoint.
        return {"mission_id": mission["mission_id"], "status": mission["status"]}

    @router.get("")
    async def list_missions(
        limit: int = Query(default=25, ge=1, le=100),
        status: MissionStatus | None = None,
        after: str | None = Query(default=None, min_length=1, max_length=128),
        user=Depends(require_account_user),
    ):
        owner = owner_id(user)
        query = {"owner_id": owner}
        if status is not None:
            query["status"] = status
        if after is not None:
            anchor = await db.guardian_missions.find_one(
                {"owner_id": owner, "mission_id": after}, {"_id": 0, "created_at": 1},
            )
            if not anchor or not anchor.get("created_at"):
                raise HTTPException(status_code=404, detail="mission_cursor_not_found")
            created_at = anchor["created_at"]
            query["$or"] = [
                {"created_at": {"$lt": created_at}},
                {"created_at": created_at, "mission_id": {"$lt": after}},
            ]
        cursor = db.guardian_missions.find(query, SAFE_FIELDS).sort(
            [("created_at", -1), ("mission_id", -1)],
        ).limit(limit + 1)
        items = [normalize_deadline(item) async for item in cursor]
        page = items[:limit]
        return {"missions": page, "next_cursor": page[-1]["mission_id"] if len(items) > limit else None}

    @router.get("/{mission_id}")
    async def get_mission(mission_id: str, user=Depends(require_account_user)):
        if not mission_id or len(mission_id) > 128:
            raise HTTPException(status_code=422, detail="invalid_mission_id")
        owner = owner_id(user)
        mission = await db.guardian_missions.find_one(
            {"owner_id": owner, "mission_id": mission_id}, SAFE_FIELDS,
        )
        if mission is None:
            raise HTTPException(status_code=404, detail="mission_not_found")
        return normalize_deadline(mission)

    @router.post("/{mission_id}/withdraw")
    async def withdraw_proposal(mission_id: str, user=Depends(require_account_user)):
        mission = await get_mission(mission_id, user)
        if mission["status"] == "cancelled":
            return {"mission_id": mission_id, "status": "cancelled"}
        try:
            updated = await transition(
                db.guardian_missions, owner_id=owner_id(user), mission_id=mission_id,
                expected="proposed", target="cancelled",
            )
        except RuntimeError:
            # A concurrent approval must win over a request to withdraw a proposal.
            current = await get_mission(mission_id, user)
            if current["status"] != "cancelled":
                raise HTTPException(status_code=409, detail="mission_no_longer_proposed")
            updated = current
        return {"mission_id": mission_id, "status": updated["status"]}

    @router.post("/{mission_id}/cancel-pending")
    async def cancel_pending(mission_id: str, user=Depends(require_account_user)):
        mission = await get_mission(mission_id, user)
        status = mission["status"]
        if status == "cancelled":
            return {"mission_id": mission_id, "status": "cancelled"}
        if status not in {"approved", "queued", "retry_wait", "awaiting_approval"}:
            raise HTTPException(status_code=409, detail="mission_not_pending_execution")
        try:
            await transition(
                db.guardian_missions, owner_id=owner_id(user), mission_id=mission_id,
                expected=status, target="cancelled",
            )
        except RuntimeError:
            current = await get_mission(mission_id, user)
            if current["status"] != "cancelled":
                raise HTTPException(status_code=409, detail="mission_state_changed")
        return {"mission_id": mission_id, "status": "cancelled"}

    return router
