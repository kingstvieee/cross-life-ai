"""Relay committed mission outbox events to a separate notice delivery queue."""
import asyncio
import logging
import os
import signal
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import ValidationError

from guardian_mission_engine import now_utc
from guardian_notice_store import (
    NOTICE_ORDER, NoticeEvent, NoticeIntegrityError, ensure_dispatch_index, ensure_outbox_index,
    record_notice_poll, upsert_dispatch_entry,
)

LOG = logging.getLogger("guardian.notice_relay")


async def relay_pending(missions, dispatch, *, limit=100):
    if not 1 <= limit <= 100:
        raise ValueError("Relay batch size must be between 1 and 100")
    rows = missions.find({"notice_outbox.next_attempt_at": {"$lte": now_utc()}},
                         {"notice_outbox.event": 1, "notice_outbox.next_attempt_at": 1,
                          "owner_id": 1, "mission_id": 1})
    relayed = 0
    async for row in rows.sort(NOTICE_ORDER).limit(limit):
        outbox = row["notice_outbox"]
        raw = outbox.get("event")
        key = {"_id": row["_id"], "notice_outbox.next_attempt_at": outbox["next_attempt_at"],
               "notice_outbox.event": {"$eq": raw}}
        clear_pending = {"notice_outbox.next_attempt_at": "", "notice_outbox.claim_token": ""}
        try:
            event = NoticeEvent.model_validate(raw)
            if (event.owner_id, event.mission_id) != (row.get("owner_id"), row.get("mission_id")):
                raise NoticeIntegrityError("Notice does not belong to its source mission")
            await upsert_dispatch_entry(dispatch, event)
        except (NoticeIntegrityError, ValidationError):
            await missions.update_one(key, {
                "$set": {"notice_outbox.quarantine_reason": "invalid_notice"},
                "$unset": clear_pending,
            })
            LOG.warning("Guardian mission notice quarantined by relay")
            continue
        updated = await missions.update_one(key, {
            "$set": {"notice_outbox.relayed_at": now_utc()}, "$unset": clear_pending,
        })
        relayed += updated.modified_count
    return relayed


def configuration():
    if os.environ.get("GUARDIAN_NOTICE_RELAY_ENABLED") != "true":
        raise RuntimeError("Guardian notice relay is disabled")
    url = os.environ.get("GUARDIAN_NOTICE_RELAY_MONGO_URL")
    database = os.environ.get("DB_NAME")
    if not url or not database:
        raise RuntimeError("Dedicated relay MongoDB credentials and DB_NAME are required")
    return url, database


async def run():
    url, database = configuration()
    client = AsyncIOMotorClient(url, tz_aware=True, serverSelectionTimeoutMS=10000)
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for signum in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(signum, stop.set)
    try:
        db = client[database]
        await ensure_outbox_index(db.guardian_missions)
        await ensure_dispatch_index(db.guardian_notice_dispatch)
        instance = f"notice-relay-{uuid4().hex}"
        LOG.info("Guardian notice relay instance %s", instance)
        while not stop.is_set():
            try:
                await relay_pending(db.guardian_missions, db.guardian_notice_dispatch)
                await record_notice_poll(
                    db.guardian_notice_relay_health, key="notice_relay", instance=instance, at=now_utc(),
                )
            except Exception as exc:
                LOG.warning("Guardian notice relay unavailable: %s", type(exc).__name__)
            try:
                await asyncio.wait_for(stop.wait(), timeout=2)
            except asyncio.TimeoutError:
                pass
    finally:
        client.close()
        for signum in (signal.SIGINT, signal.SIGTERM):
            loop.remove_signal_handler(signum)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run())
