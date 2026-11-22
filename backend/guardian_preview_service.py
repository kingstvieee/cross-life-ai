"""Opt-in worker and verifier processes for zero-cost Guardian previews."""
import argparse
import asyncio
import logging
import os
import signal
from datetime import timedelta
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorClient

from guardian_mission_engine import MissionStateChanged, ensure_indexes, now_utc
from guardian_mission_preview import PREVIEW_HANDLER, execute_preview, verify_preview
from guardian_verifier import GuardianVerifier
from guardian_worker import GuardianWorker

LOG = logging.getLogger("guardian.preview")


def configuration():
    if os.environ.get("GUARDIAN_PREVIEW_ENABLED") != "true":
        raise RuntimeError("Guardian preview service is disabled")
    url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not url or not db_name:
        raise RuntimeError("MONGO_URL and DB_NAME are required")
    interval = float(os.environ.get("GUARDIAN_PREVIEW_POLL_SECONDS", "2"))
    if not 0.1 <= interval <= 15:
        raise ValueError("Preview polling interval must be 0.1–15 seconds")
    return url, db_name, interval


async def verify_pending(collection, identity):
    gate = GuardianVerifier(collection, {PREVIEW_HANDLER: verify_preview})
    cursor = collection.find({
        "handler": PREVIEW_HANDLER, "status": "verifying", "lease_until": {"$gt": now_utc()},
    }).sort("lease_until", 1).limit(25)
    verified = 0
    async for mission in cursor:
        try:
            await gate.verify(mission=mission, verifier_name=PREVIEW_HANDLER,
                              verifier_identity=identity)
        except MissionStateChanged:
            continue
        verified += 1
    return verified


async def serve(tick, stop, interval):
    while not stop.is_set():
        try:
            processed = await tick()
            if processed:
                LOG.info("Guardian preview tick processed=%s", processed)
        except Exception as exc:
            LOG.warning("Guardian preview tick failed: %s", type(exc).__name__)
        try:
            await asyncio.wait_for(stop.wait(), timeout=interval)
        except asyncio.TimeoutError:
            pass


async def run(role):
    url, db_name, interval = configuration()
    client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=10000)
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    signals = []
    try:
        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(sig, stop.set)
                signals.append(sig)
            except NotImplementedError:
                pass
        await client.admin.command("ping")
        db = client[db_name]
        collection = db.guardian_missions
        await ensure_indexes(collection)
        identity = f"preview-{role}-{uuid4().hex}"
        health = db.guardian_service_health
        await health.create_index("expires_at", expireAfterSeconds=0)

        async def observed_tick(poll):
            processed = await poll()
            at = now_utc()
            await health.update_one(
                {"_id": identity},
                {"$set": {"role": role, "last_poll_at": at, "expires_at": at + timedelta(minutes=5)}},
                upsert=True,
            )
            return processed

        LOG.info("Guardian preview role ready: %s", role)
        if role == "worker":
            worker = GuardianWorker(collection, {PREVIEW_HANDLER: execute_preview},
                                    identity, scoped=True)
            await serve(lambda: observed_tick(worker.run_once), stop, interval)
        else:
            async def tick():
                return await verify_pending(collection, identity)

            await serve(lambda: observed_tick(tick), stop, interval)
    finally:
        for sig in signals:
            loop.remove_signal_handler(sig)
        client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("role", choices=["worker", "verifier"])
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run(parser.parse_args().role))
