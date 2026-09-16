import asyncio
from copy import deepcopy

import pytest

from guardian_store import GuardianStore


class WriteResult:
    def __init__(self, matched_count=0):
        self.matched_count = matched_count


class FakeCollection:
    def __init__(self):
        self.documents = {}

    async def update_one(self, query, update, upsert=False):
        user_id = query["user_id"]
        current = self.documents.get(user_id)

        if current is None and upsert:
            current = deepcopy(update.get("$setOnInsert", {}))
            self.documents[user_id] = current
            return WriteResult(0)

        if current is None:
            return WriteResult(0)

        expected_version = query.get("version")
        if expected_version is not None and current.get("version", 0) != expected_version:
            return WriteResult(0)

        current.update(deepcopy(update.get("$set", {})))
        for key, value in update.get("$inc", {}).items():
            current[key] = current.get(key, 0) + value
        return WriteResult(1)

    async def find_one(self, query, projection=None):
        document = self.documents.get(query["user_id"])
        return deepcopy(document) if document else None


def run(coro):
    return asyncio.run(coro)


def test_users_receive_isolated_durable_guardian_state():
    collection = FakeCollection()
    store = GuardianStore(collection)

    steven = run(store.briefing("user-steven"))
    guest = run(store.briefing("user-guest"))

    assert steven["persistence"]["durable"] is True
    assert steven["persistence"]["scope"] == "per-user"
    assert steven["priority"]["id"] == "hub-core-build"
    assert guest["priority"]["id"] == "hub-core-build"
    assert set(collection.documents) == {"user-steven", "user-guest"}


def test_verified_completion_survives_new_store_instance():
    collection = FakeCollection()
    first = GuardianStore(collection)

    run(first.update_mission(
        "user-steven",
        "hub-core-build",
        {"status": "completed", "currentState": "Foundation verified and landed."},
        ledger_state="VERIFIED_COMPLETE",
        summary="Guardian Core foundation landed.",
        evidence={"mergeCommit": "verified-test-sha"},
    ))

    second = GuardianStore(collection)
    mission = run(second.get_mission("user-steven", "hub-core-build"))
    briefing = run(second.briefing("user-steven"))

    assert mission["status"] == "completed"
    assert mission["lastVerifiedUpdate"]
    assert briefing["persistence"]["version"] == 1
    assert briefing["recentActivity"][-1]["state"] == "VERIFIED_COMPLETE"


def test_completion_without_evidence_is_rejected_and_not_persisted():
    collection = FakeCollection()
    store = GuardianStore(collection)

    with pytest.raises(ValueError, match="Completion requires VERIFIED_COMPLETE"):
        run(store.update_mission(
            "user-steven",
            "hub-core-build",
            {"status": "completed"},
            ledger_state="VERIFIED_COMPLETE",
            evidence=None,
        ))

    mission = run(store.get_mission("user-steven", "hub-core-build"))
    assert mission["status"] == "active"
    assert collection.documents["user-steven"]["version"] == 0


def test_private_mode_is_scoped_and_persisted():
    collection = FakeCollection()
    store = GuardianStore(collection)

    run(store.set_private_mode("user-steven", True))

    steven = run(GuardianStore(collection).briefing("user-steven"))
    guest = run(GuardianStore(collection).briefing("user-guest"))

    assert steven["privateMode"] is True
    assert guest["privateMode"] is False
    assert steven["recentActivity"][-1]["state"] == "VERIFIED_COMPLETE"
