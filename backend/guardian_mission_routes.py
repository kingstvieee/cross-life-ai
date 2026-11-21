"""Authenticated, tenant-scoped Guardian mission inspection API.

Mission proposals are inert until separately approved. Owners can cancel
pending execution. This router exposes no approval, execution, or spend controls.
"""
from datetime import timezone
import re
from typing import Literal, get_args

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator
from pymongo.errors import DuplicateKeyError
from guardian_mission_engine import MissionConflict, now_utc, submit_mission, transition
from guardian_mission_preview import PREVIEW_HANDLER, bson_datetime, preview_digest, queue_preview, utc_datetime

SAFE_FIELDS = {
    "_id": 0, "owner_id": 1, "mission_id": 1, "objective": 1,
    "status": 1, "created_at": 1, "updated_at": 1,
    "not_before": 1, "retry_after": 1, "attempts": 1,
    "recovery_reason": 1, "success_criteria": 1, "budget_cad": 1, "expires_at": 1,
    "evidence.passed": 1, "evidence.verified_at": 1, "evidence.result_digest": 1,
    "preview_approval.approved_at": 1,
    "preview_acknowledged_at": 1,
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


class PreviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    proposal_digest: str = Field(pattern=r"^[0-9a-f]{64}$")
    run_at: AwareDatetime | None = None


def present_mission(mission, *, preview_enabled):
    for record, fields in (
        (mission, ("created_at", "updated_at", "not_before", "retry_after", "expires_at",
                   "preview_acknowledged_at")),
        (mission.get("preview_approval") or {}, ("approved_at",)),
    ):
        for field in fields:
            timestamp = record.get(field)
            if timestamp is not None and timestamp.tzinfo is None:
                record[field] = timestamp.replace(tzinfo=timezone.utc)
    mission["available_actions"] = []
    if mission.get("status") == "proposed":
        mission["available_actions"].append("withdraw")
        if preview_enabled and (mission.get("expires_at") is None or mission["expires_at"] > now_utc()):
            mission["available_actions"].append("queue-preview")
            mission["preview_digest"] = preview_digest(mission)
    if mission.get("status") in PENDING_CANCELLATION_STATES:
        mission["available_actions"].append("cancel-pending")
    if (preview_enabled and mission.get("status") == "completed" and
            mission.get("preview_approval") and
            (mission.get("evidence") or {}).get("passed") is True and
            mission.get("preview_acknowledged_at") is None):
        mission["available_actions"].append("acknowledge-preview")
    return mission


def prevent_mission_response_caching(response: Response):
    response.headers["Cache-Control"] = "private, no-store"


def build_guardian_mission_router(*, db, require_account_user, preview_enabled=False):
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
        search: str | None = Query(default=None, max_length=120),
        order: Literal["newest", "oldest"] = "newest",
        user=Depends(require_account_user),
    ):
        owner = owner_id(user)
        query = {"owner_id": owner}
        if search is not None:
            term = search.strip()
            if not term:
                raise HTTPException(status_code=422, detail="empty_mission_search")
            expression = {"$regex": re.escape(term), "$options": "i"}
            query["$and"] = [{"$or": [
                {"objective": expression}, {"success_criteria": expression},
            ]}]
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
            # Cursor must belong to the same tenant and active filters.
            # Otherwise a stale cursor can silently skip search results.
            anchor_query = {"owner_id": owner, "mission_id": after}
            if "status" in query:
                anchor_query["status"] = query["status"]
            if "$and" in query:
                anchor_query["$and"] = query["$and"]
            anchor = await db.guardian_missions.find_one(
                anchor_query, {"_id": 0, "created_at": 1},
            )
            if not anchor or not anchor.get("created_at"):
                raise HTTPException(status_code=404, detail="mission_cursor_not_found")
            created_at = anchor["created_at"]
            direction = "$lt" if order == "newest" else "$gt"
            query.setdefault("$and", []).append({"$or": [
                {"created_at": {direction: created_at}},
                {"created_at": created_at, "mission_id": {direction: after}},
            ]})
        direction = -1 if order == "newest" else 1
        cursor = db.guardian_missions.find(query, SAFE_FIELDS).sort(
            [("created_at", direction), ("mission_id", direction)],
        ).limit(limit + 1)
        items = [present_mission(item, preview_enabled=preview_enabled) async for item in cursor]
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
        return present_mission(mission, preview_enabled=preview_enabled)

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

    @router.post("/{mission_id}/queue-preview")
    async def schedule_preview(mission_id: str, request: PreviewRequest, user=Depends(require_account_user)):
        if not preview_enabled:
            raise HTTPException(status_code=404, detail="mission_preview_disabled")
        if not mission_id or len(mission_id) > 128:
            raise HTTPException(status_code=422, detail="invalid_mission_id")
        try:
            mission = await queue_preview(
                db.guardian_missions, owner_id=owner_id(user), mission_id=mission_id,
                digest=request.proposal_digest, run_at=request.run_at,
            )
        except MissionConflict as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        if mission is None:
            raise HTTPException(status_code=404, detail="mission_not_found")
        return {"mission_id": mission_id, "status": mission["status"],
                "not_before": utc_datetime(mission["not_before"])}

    @router.post("/{mission_id}/acknowledge-preview")
    async def acknowledge_preview(mission_id: str, user=Depends(require_account_user)):
        if not preview_enabled:
            raise HTTPException(status_code=404, detail="mission_preview_disabled")
        await get_mission(mission_id, user)
        query = {
            "owner_id": owner_id(user), "mission_id": mission_id, "status": "completed",
            "handler": PREVIEW_HANDLER, "evidence.passed": True,
        }
        mission = await db.guardian_missions.find_one_and_update(
            {**query, "preview_acknowledged_at": None},
            {"$set": {"preview_acknowledged_at": bson_datetime(now_utc())}},
            return_document=True,
        )
        if mission is None:
            mission = await db.guardian_missions.find_one(query)
        if mission is None or mission.get("preview_acknowledged_at") is None:
            raise HTTPException(status_code=409, detail="preview_not_completed")
        return {"mission_id": mission_id,
                "preview_acknowledged_at": utc_datetime(mission["preview_acknowledged_at"])}

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
