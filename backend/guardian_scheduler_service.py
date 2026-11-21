"""Opt-in standalone Guardian scheduler process.

Run under a process supervisor (container service/systemd). This process only
releases explicitly due retry_wait missions; it does not execute actions.
Never start it implicitly in FastAPI startup or during module import.
"""
import asyncio
import logging
import os
import signal

from motor.motor_asyncio import AsyncIOMotorClient

from guardian_mission_engine import ensure_indexes, recover_expired_leases
from guardian_scheduler import scheduler_tick

LOG = logging.getLogger("guardian.scheduler")


def configuration():
    if os.getenv("GUARDIAN_SCHEDULER_ENABLED") != "true":
        raise RuntimeError("Scheduler disabled: set GUARDIAN_SCHEDULER_ENABLED=true")
    url = os.getenv("MONGO_URL")
    db_name = os.getenv("DB_NAME")
    if not url or not db_name:
        raise RuntimeError("MONGO_URL and DB_NAME are required")
    interval = float(os.getenv("GUARDIAN_SCHEDULER_POLL_SECONDS", "5"))
    if not 1 <= interval <= 300:
        raise ValueError("Scheduler polling interval must be 1-300 seconds")
    return url, db_name, interval


async def serve(collection, stop, *, interval=5):
    if not 1 <= interval <= 300:
        raise ValueError("Scheduler polling interval must be 1-300 seconds")
    while not stop.is_set():
        try:
            released = await scheduler_tick(collection)
            recovery = await recover_expired_leases(collection)
            LOG.info("scheduler tick released=%s recovered=%s",
                     released, recovery)
        except Exception:
            LOG.exception("scheduler tick failed; will retry")
        try:
            await asyncio.wait_for(stop.wait(), timeout=interval)
        except asyncio.TimeoutError:
            pass


async def main():
    url, db_name, interval = configuration()
    client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=10000)
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, stop.set)
        except NotImplementedError:
            pass
    try:
        await client.admin.command("ping")
        collection = client[db_name]["guardian_missions"]
        await ensure_indexes(collection)
        await collection.create_index([("status", 1), ("retry_after", 1)])
        await collection.create_index([("status", 1), ("not_before", 1)])
        LOG.info("Guardian scheduler ready; polling every %s seconds", interval)
        await serve(collection, stop, interval=interval)
    finally:
        client.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
