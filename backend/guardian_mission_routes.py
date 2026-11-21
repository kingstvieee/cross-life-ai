"""Authenticated, tenant-scoped Guardian mission inspection API.

Mission proposals are inert until separately approved. Owners can cancel
pending execution. This router exposes no approval, execution, or spend controls.
"""
from datetime import timezone
from typing import Literal, get_args

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator
from pymongo.errors import DuplicateKeyError
from guardian_mission_engine import MissionConflict, submit_mission, transition

SAFE_FIELDS = {
    "_id": 0, "owner_id": 1, "mission_id": 1, "objective": 1,
    "status": 1, "created_at": 1, "updated_at": 1,
    "not_before": 1, "retry_after": 1, "attempts": 1,
    "recovery_reason": 1, "success_criteria": 1, "budget_cad": 1, "expires_at": 1,
    "evidence.passed": 1, "evidence.verified_at": 1, "evidence.result_digest": 1,
}

MissionStatus = Literal[
    "proposed", "approved", "queued", "leased", "running", "verifying",
    "retry_wait", "awaiting_approval", "completed", "blocked", "cancelled",
]
PENDING_CANCELLATION_STATES = {"approved", "queued", "retry_wait", "awaiting_approval"}


class MissionProposal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    objective: str = Field(min_length=1, max_length=2000)
    idempotency_key: str = Field(min_length=8, max_length=128, pattern=r"^\S+$")
    success_criteria: str = Field(min_length=1, max_length=2000)
    budget_cad: float = Field(default=0, ge=0, le=1000000, strict=True)
    expires_at: AwareDatetime | None = None

    @field_validator("objective", "success_criteria", mode="before")
    @classmethod
    def trim_proposal_text(cls, value):
        return value.strip() if isinstance(value, str) else value


def present_mission(mission):
    for field in ("created_at", "updated_at", "not_before", "retry_after", "expires_at"):
        timestamp = mission.get(field)
        if timestamp is not None and timestamp.tzinfo is None:
            mission[field] = timestamp.replace(tzinfo=timezone.utc)
    mission["available_actions"] = []
    if mission.get("status") == "proposed":
        mission["available_actions"].append("withdraw")
    if mission.get("status") in PENDING_CANCELLATION_STATES:
        mission["available_actions"].append("cancel-pending")
    return mission


def prevent_mission_response_caching(response: Response):
    response.headers["Cache-Control"] = "private, no-store"


def build_guardian_mission_router(*, db, require_account_user):
    router = APIRouter(
        prefix="/guardian/missions", tags=["guardian-missions"],
        dependencies=[Depends(prevent_mission_response_caching)],
    )

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
        status: list[MissionStatus] | None = Query(default=None, max_length=11),
        created_from: AwareDatetime | None = None,
        created_before: AwareDatetime | None = None,
        after: str | None = Query(default=None, min_length=1, max_length=128),
        user=Depends(require_account_user),
    ):
        owner = owner_id(user)
        query = {"owner_id": owner}
        if status:
            query["status"] = status[0] if len(status) == 1 else {"$in": status}
        if created_from and created_before and created_from >= created_before:
            raise HTTPException(status_code=422, detail="invalid_mission_creation_window")
        if created_from or created_before:
            query["created_at"] = {}
            if created_from:
                query["created_at"]["$gte"] = created_from
            if created_before:
                query["created_at"]["$lt"] = created_before
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
        items = [present_mission(item) async for item in cursor]
        page = items[:limit]
        return {"missions": page, "next_cursor": page[-1]["mission_id"] if len(items) > limit else None}

    @router.get("/summary")
    async def summarize_missions(user=Depends(require_account_user)):
        counts = dict.fromkeys(get_args(MissionStatus), 0)
        groups = db.guardian_missions.aggregate([
            {"$match": {"owner_id": owner_id(user), "status": {"$in": list(counts)}}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ])
        async for group in groups:
            counts[group["_id"]] = group["count"]
        return {"counts": counts, "total": sum(counts.values())}

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
        return present_mission(mission)

    @router.post("/{mission_id}/withdraw")
    async def withdraw_proposal(mission_id: str, user=Depends(require_account_user)):
        mission = await get_mission(mission_id, user)
        if mission["status"] == "cancelled":
            return {"mission_id": mission_id, "status": "cancelled"}
        try:
            updated = await transition(
                db.guardian_missions, owner_id=owner_id(user), mission_id=mission_id,
                expected="proposed", target="cancelled",
                cancellation_reason="owner_withdrew_proposal",
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
        if status not in PENDING_CANCELLATION_STATES:
            raise HTTPException(status_code=409, detail="mission_not_pending_execution")
        try:
            await transition(
                db.guardian_missions, owner_id=owner_id(user), mission_id=mission_id,
                expected=status, target="cancelled",
                cancellation_reason="owner_cancelled_pending_execution",
            )
        except RuntimeError:
            current = await get_mission(mission_id, user)
            if current["status"] != "cancelled":
                raise HTTPException(status_code=409, detail="mission_state_changed")
        return {"mission_id": mission_id, "status": "cancelled"}

    return router
