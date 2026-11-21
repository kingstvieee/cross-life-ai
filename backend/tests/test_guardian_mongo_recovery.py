"""Verify recovery and stale worker fencing against a real MongoDB instance."""
from datetime import timedelta
import os
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorClient
import pytest

from guardian_mission_engine import (
    claim_mission, ensure_indexes, now_utc, recover_expired_leases, transition,
)


@pytest.mark.asyncio
async def test_restart_preserves_checkpoint_and_prevents_replay():
    url = os.environ.get("GUARDIAN_TEST_MONGO_URL")
    if not url:
        pytest.skip("Guardian integration MongoDB is unavailable")
    name = f"guardian_recovery_test_{uuid4().hex}"
    first = AsyncIOMotorClient(url, serverSelectionTimeoutMS=5000)
    restarted = AsyncIOMotorClient(url, serverSelectionTimeoutMS=5000)
    try:
        missions = first[name].missions
        await ensure_indexes(missions)
        await missions.insert_one({
            "owner_id": "test-owner", "mission_id": "mission",
            "idempotency_key": "local-recovery-probe", "status": "queued",
            "lease_until": None, "created_at": now_utc(),
        })
        first_claim = await claim_mission(missions, worker_id="first")
        checkpoint = {"test_marker": "effect may have occurred"}
        await transition(
            missions, owner_id="test-owner", mission_id="mission", expected="leased",
            target="running", lease_token=first_claim["lease_token"], checkpoint=checkpoint,
        )
        await missions.update_one(
            {"mission_id": "mission"},
            {"$set": {"lease_until": now_utc() - timedelta(seconds=1)}},
        )
        first.close()

        missions = restarted[name].missions
        assert await recover_expired_leases(missions) == {"requeued": 0, "quarantined": 1}
        assert await claim_mission(missions, worker_id="restarted") is None
        saved = await missions.find_one({"mission_id": "mission"})
        assert saved["status"] == "blocked"
        assert saved["checkpoint"] == checkpoint
        with pytest.raises(RuntimeError):
            await transition(
                missions, owner_id="test-owner", mission_id="mission", expected="running",
                target="verifying", lease_token=first_claim["lease_token"],
            )
    finally:
        first.close()
        try:
            await restarted.drop_database(name)
        finally:
            restarted.close()
