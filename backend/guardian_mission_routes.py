"""Authenticated, tenant-scoped Guardian mission inspection API.

Read-only first integration: no mission submission, approval, execution,
or spend controls are exposed until their security model is reviewed.
"""
from fastapi import APIRouter, Depends, HTTPException, Query

SAFE_FIELDS = {
    "_id": 0, "owner_id": 1, "mission_id": 1, "objective": 1,
    "status": 1, "created_at": 1, "updated_at": 1,
    "not_before": 1, "retry_after": 1, "attempts": 1,
    "recovery_reason": 1,
}


def build_guardian_mission_router(*, db, require_account_user):
    router = APIRouter(prefix="/guardian/missions", tags=["guardian-missions"])

    def owner_id(user):
        value = user.get("user_id")
        if not isinstance(value, str) or not value:
            raise HTTPException(status_code=403, detail="account_identity_required")
        return value

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

    return router
