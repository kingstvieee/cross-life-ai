"""Durable Guardian scheduling regression tests."""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from guardian_scheduler import schedule_approved, release_due_retries, scheduler_tick

NOW = datetime(2026, 11, 21, 12, tzinfo=timezone.utc)


class Cursor:
    def __init__(self, docs):
        self.docs = docs

    def sort(self, *_):
        return self

    def limit(self, limit):
        self.docs = self.docs[:limit]
        return self

    def __aiter__(self):
        self.iterator = iter(self.docs)
        return self

    async def __anext__(self):
        try:
            return next(self.iterator)
        except StopIteration:
            raise StopAsyncIteration


class Collection:
    def __init__(self):
        self.schedule_query = None
        self.schedule_update = None
        self.retry_query = None
        self.updates = []
        self.docs = [{"_id": "m1", "retry_after": NOW - timedelta(seconds=1)}]

    async def find_one_and_update(self, query, update, **kwargs):
        self.schedule_query = query
        self.schedule_update = update
        return {"mission_id": query["mission_id"], "_id": "internal"}

    def find(self, query, projection):
        self.retry_query = query
        return Cursor(self.docs[:])

    async def update_one(self, query, update):
        self.updates.append((query, update))
        return SimpleNamespace(modified_count=1)


@pytest.mark.asyncio
async def test_scheduling_requires_approval_and_preserves_utc():
    collection = Collection()
    run_at = NOW + timedelta(hours=2)
    mission = await schedule_approved(
        collection, owner_id="owner", mission_id="mission", run_at=run_at)
    assert collection.schedule_query["status"] == "approved"
    assert collection.schedule_query["owner_id"] == "owner"
    assert collection.schedule_query["$or"][0] == {"expires_at": None}
    assert collection.schedule_query["$or"][1]["expires_at"]["$gt"] >= run_at
    assert collection.schedule_update["$set"]["not_before"] == run_at
    assert "_id" not in mission


@pytest.mark.asyncio
async def test_reject_naive_scheduled_time():
    with pytest.raises(ValueError):
        await schedule_approved(
            Collection(), owner_id="owner", mission_id="mission",
            run_at=datetime(2026, 11, 21))


@pytest.mark.asyncio
async def test_retry_release_uses_cas_and_due_filter():
    collection = Collection()
    assert await release_due_retries(collection, now=NOW) == 1
    assert collection.retry_query["status"] == "retry_wait"
    assert collection.retry_query["retry_after"] == {"$lte": NOW}
    query, update = collection.updates[0]
    assert query["status"] == "retry_wait"
    assert query["retry_after"] == NOW - timedelta(seconds=1)
    assert query["$or"] == collection.retry_query["$or"] == [
        {"expires_at": None}, {"expires_at": {"$gt": NOW}},
    ]
    assert update["$set"]["status"] == "queued"
    assert update["$unset"] == {"retry_after": ""}


@pytest.mark.asyncio
async def test_tick_reports_released_retries():
    assert await scheduler_tick(Collection(), now=NOW) == {"released_retries": 1}


@pytest.mark.asyncio
async def test_retry_batch_limit_validation():
    with pytest.raises(ValueError):
        await release_due_retries(Collection(), now=NOW, limit=0)
