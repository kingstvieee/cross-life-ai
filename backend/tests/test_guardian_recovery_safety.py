"""Regression tests for interruption recovery.

Running/verifying missions may already have caused external effects. They must
not be silently replayed when a worker loses its lease.
"""
import pytest
from guardian_mission_engine import recover_expired_leases


class Result:
    def __init__(self, count):
        self.modified_count = count


class FakeCollection:
    def __init__(self):
        self.calls = []

    async def update_many(self, query, update):
        self.calls.append((query, update))
        return Result(2 if len(self.calls) == 1 else 3)


@pytest.mark.asyncio
async def test_recovery_requeues_only_unstarted_leases():
    collection = FakeCollection()
    summary = await recover_expired_leases(collection)
    assert summary == {"requeued": 2, "quarantined": 3, "expired": 3}
    first_query, first_update = collection.calls[0]
    assert first_query["status"] == "leased"
    assert first_update["$set"]["status"] == "queued"
    assert first_query["$or"][0] == {"expires_at": None}
    expired_query, expired_update = collection.calls[2]
    assert expired_query["status"] == "leased"
    assert "$lte" in expired_query["expires_at"]
    assert expired_update["$set"]["status"] == "cancelled"


@pytest.mark.asyncio
async def test_recovery_quarantines_uncertain_side_effects():
    collection = FakeCollection()
    await recover_expired_leases(collection)
    second_query, second_update = collection.calls[1]
    assert set(second_query["status"]["$in"]) == {"running", "verifying"}
    assert second_update["$set"]["status"] == "blocked"
    assert second_update["$set"]["recovery_reason"] == "expired_lease_requires_reconciliation"
    assert second_update["$set"]["lease_token"] is None
