"""Opt-in consumer for Guardian's isolated dispatch queue. This service has no HTTP route."""
import asyncio
import logging
import os
import signal
from datetime import timedelta, timezone
from random import uniform
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import ValidationError
from pymongo.errors import PyMongoError

from guardian_mission_engine import now_utc
from guardian_notice_store import (
    DISPATCH_ORDER, NoticeEvent, NoticeIntegrityError, ensure_dispatch_index, ensure_inbox_index,
    record_notice_poll, upsert_inbox_entry,
)

LOG = logging.getLogger("guardian.notices")
CLAIM_WINDOW = timedelta(seconds=60)


async def pending_metrics(dispatch):
    cursor = dispatch.aggregate([
        {"$match": {"delivery.next_attempt_at": {"$exists": True}}},
        {"$group": {"_id": None, "depth": {"$sum": 1}, "oldest": {"$min": "$event.created_at"}}},
    ])
    rows = await cursor.to_list(length=1)
    if not rows:
        return {"depth": 0, "oldest_age_seconds": 0}
    row = rows[0]
    oldest = row["oldest"]
    age = (now_utc() - oldest.replace(tzinfo=timezone.utc)).total_seconds() if oldest else 0
    return {"depth": row["depth"], "oldest_age_seconds": max(0, int(age))}


async def scan_pending(dispatch, inbox, *, limit=100):
    """Claim at most limit due events, leaving failed claims available after expiry."""
    if not 1 <= limit <= 100:
        raise ValueError("Notice batch size must be between 1 and 100")
    processed = 0
    for _ in range(limit):
        now = now_utc()
        token = uuid4().hex
        claimed = await dispatch.find_one_and_update(
            {"delivery.next_attempt_at": {"$lte": now}},
            {"$set": {"delivery.claim_token": token,
                      "delivery.next_attempt_at": now + CLAIM_WINDOW},
             "$inc": {"delivery.attempts": 1}},
            sort=DISPATCH_ORDER, projection={"event": 1, "delivery.attempts": 1},
            return_document=True,
        )
        if claimed is None:
            break
        claim = {"_id": claimed["_id"], "delivery.claim_token": token}
        clear_claim = {"delivery.claim_token": ""}
        try:
            event = NoticeEvent.model_validate(claimed["event"])
            await upsert_inbox_entry(inbox, event)
        except (ValidationError, NoticeIntegrityError, KeyError):
            await dispatch.update_one(
                {**claim, "delivery.next_attempt_at": {"$gt": now_utc()}},
                {"$set": {"delivery.quarantine_reason": "invalid_notice"},
                        "$unset": {**clear_claim, "delivery.next_attempt_at": ""}},
            )
            LOG.warning("Guardian notice quarantined")
            continue
        except PyMongoError:
            attempts = claimed["delivery"]["attempts"]
            delay = min(5 * (2 ** min(attempts - 1, 7)) + uniform(0, 3), 900)
            failed_at = now_utc()
            await dispatch.update_one(
                {**claim, "delivery.next_attempt_at": {"$gt": failed_at}},
                {"$set": {"delivery.next_attempt_at": failed_at + timedelta(seconds=delay)},
                        "$unset": clear_claim},
            )
            LOG.warning("Guardian notice write will retry")
            continue
        now = now_utc()
        completed = await dispatch.update_one(
            {**claim, "event.event_id": event.event_id,
             "delivery.next_attempt_at": {"$gt": now}},
            {"$set": {"delivery.processed_at": now},
             "$unset": {**clear_claim, "delivery.next_attempt_at": ""}},
        )
        processed += completed.modified_count
    return processed


def configuration():
    if os.environ.get("GUARDIAN_NOTICE_ENABLED") != "true":
        raise RuntimeError("Guardian notice service is disabled")
    url = os.environ.get("GUARDIAN_NOTICE_MONGO_URL")
    database = os.environ.get("DB_NAME")
    if not url or not database:
        raise RuntimeError("Dedicated notice MongoDB credentials and DB_NAME are required")
    return url, database


async def run():
    url, database = configuration()
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for signum in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(signum, stop.set)
    client = AsyncIOMotorClient(url, tz_aware=True, serverSelectionTimeoutMS=10000)
    try:
        db = client[database]
        dispatch, inbox = db.guardian_notice_dispatch, db.guardian_inbox
        await ensure_dispatch_index(dispatch)
        await ensure_inbox_index(inbox)
        instance = f"notice-consumer-{uuid4().hex}"
        LOG.info("Guardian notice consumer instance %s", instance)
        next_metrics_at = 0
        while not stop.is_set():
            try:
                await scan_pending(dispatch, inbox)
                await record_notice_poll(
                    db.guardian_notice_consumer_health, key="notice_consumer", instance=instance, at=now_utc(),
                )
                if loop.time() >= next_metrics_at:
                    metrics = await pending_metrics(dispatch)
                    LOG.info("Guardian pending notices depth=%s oldest_age_seconds=%s",
                             metrics["depth"], metrics["oldest_age_seconds"])
                    next_metrics_at = loop.time() + 30
            except Exception as exc:
                LOG.warning("Guardian notice scan unavailable: %s", type(exc).__name__)
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
