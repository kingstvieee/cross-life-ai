"""Guardian durable scheduling primitives.

Call tick() from a separately deployed, supervised scheduler process.
No in-process timer or web-request lifecycle is relied upon for persistence.
Only already-approved missions can be released to the worker queue.
"""
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc)


async def schedule_approved(collection, *, owner_id, mission_id, run_at):
    """Atomically schedule an approved mission without bypassing approval."""
    if not isinstance(run_at, datetime) or run_at.tzinfo is None:
        raise ValueError("run_at must be timezone-aware")
    if not owner_id or not mission_id:
        raise ValueError("owner and mission required")
    now = utcnow()
    doc = await collection.find_one_and_update(
        {"owner_id": owner_id, "mission_id": mission_id,
         "status": "approved",
         "$or": [{"expires_at": None}, {"expires_at": {"$gt": max(now, run_at)}}]},
        {"$set": {"status": "queued", "not_before": run_at.astimezone(timezone.utc),
                  "updated_at": now}},
        return_document=True,
    )
    if doc is None:
        raise RuntimeError("Mission not approved or changed concurrently")
    doc.pop("_id", None)
    return doc


async def release_due_retries(collection, *, now=None, limit=100):
    """Move due retries to queued with bounded, compare-and-swap updates.

    This never releases blocked, awaiting-approval or cancelled missions.
    Each retry must carry a retry_after deadline, set by a trusted scheduler.
    """
    if not 1 <= limit <= 1000:
        raise ValueError("limit must be between 1 and 1000")
    now = now or utcnow()
    if now.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    cursor = collection.find(
        {"status": "retry_wait", "retry_after": {"$lte": now},
         "$or": [{"expires_at": None}, {"expires_at": {"$gt": now}}]},
        {"_id": 1, "retry_after": 1},
    ).sort("retry_after", 1).limit(limit)
    released = 0
    async for item in cursor:
        result = await collection.update_one(
            {"_id": item["_id"], "status": "retry_wait",
             "retry_after": item["retry_after"],
             "$or": [{"expires_at": None}, {"expires_at": {"$gt": now}}]},
            {"$set": {"status": "queued", "not_before": now,
                      "updated_at": now},
             "$unset": {"retry_after": ""}},
        )
        released += result.modified_count
    return released


async def scheduler_tick(collection, *, now=None, limit=100):
    """Single durable scheduler tick; orchestration must invoke repeatedly."""
    now = now or utcnow()
    released = await release_due_retries(collection, now=now, limit=limit)
    expired = await collection.update_many(
        {"status": {"$in": ["proposed", "approved", "queued", "retry_wait",
                            "awaiting_approval"]},
         "expires_at": {"$lte": now}},
        {"$set": {"status": "cancelled", "updated_at": now,
                  "recovery_reason": "mission_deadline_expired"},
         "$unset": {"retry_after": ""}},
    )
    return {"released_retries": released, "expired_missions": expired.modified_count}
