"""Authenticated, tenant-scoped Guardian mission inspection API.

Mission proposals are inert until separately approved. No approval, execution,
or spend controls are exposed by this router.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError
from guardian_mission_engine import MissionConflict, submit_mission, transition

SAFE_FIELDS = {
    "_id": 0, "owner_id": 1, "mission_id": 1, "objective": 1,
    "status": 1, "created_at": 1, "updated_at": 1,
    "not_before": 1, "retry_after": 1, "attempts": 1,
    "recovery_reason": 1, "success_criteria": 1, "budget_cad": 1,
}


class MissionProposal(BaseModel):
    objective: str = Field(min_length=1, max_length=2000)
    idempotency_key: str = Field(min_length=8, max_length=128)
    success_criteria: str = Field(min_length=1, max_length=2000)
    budget_cad: float = Field(default=0, ge=0, le=1000000)


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
            )
        except (DuplicateKeyError, MissionConflict):
            raise HTTPException(status_code=409, detail="mission_conflict")
        # Proposal is never queued or executed by this endpoint.
        return {"mission_id": mission["mission_id"], "status": mission["status"]}

    @router.get("")
    async def list_missions(
        limit: int = Query(default=25, ge=1, le=100),
        user=Depends(require_account_user),
    ):
        owner = owner_id(user)
        cursor = db.guardian_missions.find(
            {"owner_id": owner}, SAFE_FIELDS,
        ).sort("created_at", -1).limit(limit)
        return {"missions": [item async for item in cursor]}

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
        return mission

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

    return router
