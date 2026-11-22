"""Signed-in access to an owner's durable Guardian inbox."""
import json
import logging
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field

from guardian_mission_engine import now_utc
from guardian_mission_preview import bson_datetime, utc_datetime
from guardian_mission_routes import prevent_mission_response_caching
from guardian_notice_store import NOTICE_LABELS, notice_readiness

NoticeId = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
LOG = logging.getLogger("guardian.notice_receipts")


def present_notice(row):
    read_at = row.get("read_at")
    kind = row["event"]["kind"]
    return {"notice_id": row["notice_id"], "kind": kind, "label": NOTICE_LABELS[kind],
            "created_at": utc_datetime(row["created_at"]),
            "read_at": utc_datetime(read_at) if read_at is not None else None}


def build_guardian_notice_router(*, db, require_account_user, read_retention_days=30):
    if type(read_retention_days) is not int or not 1 <= read_retention_days <= 365:
        raise ValueError("Notice retention must be between 1 and 365 days")
    notices = db.guardian_inbox
    router = APIRouter(prefix="/guardian/notices", tags=["guardian-notices"],
                       dependencies=[Depends(prevent_mission_response_caching)])

    async def owner(user=Depends(require_account_user)):
        value = user.get("user_id")
        if not isinstance(value, str) or not value:
            raise HTTPException(status_code=403, detail="account_identity_required")
        return value

    @router.get("")
    async def list_notices(
        limit: int = Query(25, ge=1, le=100), unread: bool = False,
        after: NoticeId | None = None, owner_id=Depends(owner),
    ):
        query = {"owner_id": owner_id}
        if unread:
            query["read_at"] = None
        if after is not None:
            anchor = await notices.find_one(
                {"owner_id": owner_id, "notice_id": after}, {"created_at": 1, "event_id": 1},
            )
            if anchor is None:
                raise HTTPException(status_code=404, detail="notice_cursor_not_found")
            query["$or"] = [
                {"created_at": {"$lt": anchor["created_at"]}},
                {"created_at": anchor["created_at"], "event_id": {"$lt": anchor["event_id"]}},
            ]
        cursor = notices.find(query, {
            "_id": 0, "notice_id": 1, "event.kind": 1, "created_at": 1, "read_at": 1,
        }).sort([("created_at", -1), ("event_id", -1)]).limit(limit + 1)
        rows = [present_notice(row) async for row in cursor]
        more = len(rows) > limit
        return {"notices": rows[:limit], "next_cursor": rows[limit - 1]["notice_id"] if more else None}

    @router.get("/summary")
    async def summary(owner_id=Depends(owner)):
        return {"unread": await notices.count_documents({"owner_id": owner_id, "read_at": None})}

    @router.get("/readiness")
    async def readiness(_owner_id=Depends(owner)):
        return await notice_readiness(db.guardian_notice_consumer_health, db.guardian_notice_relay_health)

    @router.post("/{notice_id}/read")
    async def mark_read(notice_id: NoticeId, owner_id=Depends(owner)):
        key = {"owner_id": owner_id, "notice_id": notice_id}
        projection = {"_id": 0, "read_at": 1}
        timestamp = bson_datetime(now_utc())
        row = await notices.find_one_and_update(
            {**key, "read_at": None},
            {"$set": {"read_at": timestamp, "expires_at": timestamp + timedelta(days=read_retention_days)}},
            projection=projection, return_document=True,
        )
        if row is not None:
            LOG.info("Guardian notice read %s", json.dumps({
                "notice_id": notice_id, "owner_id": owner_id, "read_at": timestamp.isoformat(),
            }))
        else:
            row = await notices.find_one(key, projection)
        if row is None:
            raise HTTPException(status_code=404, detail="notice_not_found")
        return {"notice_id": notice_id, "read_at": utc_datetime(row["read_at"])}

    @router.get("/{notice_id}/mission")
    async def linked_mission(notice_id: NoticeId, owner_id=Depends(owner)):
        row = await notices.find_one(
            {"owner_id": owner_id, "notice_id": notice_id}, {"event.mission_id": 1},
        )
        if row is not None:
            mission = await db.guardian_missions.find_one(
                {"owner_id": owner_id, "mission_id": row["event"]["mission_id"]},
                {"_id": 0, "mission_id": 1},
            )
            if mission is not None:
                return mission
        raise HTTPException(status_code=404, detail="notice_mission_unavailable")

    return router
