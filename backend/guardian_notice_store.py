"""Storage contract for terminal mission notices and their durable inbox copies."""
import asyncio
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pymongo.errors import DuplicateKeyError

NOTICE_KINDS = {
    "independent_verification_passed": "result_ready",
    "independent_verification_failed": "needs_review",
    "expired_lease_requires_reconciliation": "needs_review",
    "handler_outcome_requires_reconciliation": "needs_review",
}
NOTICE_LABELS = {"result_ready": "Result ready", "needs_review": "Needs review"}
NOTICE_ORDER = [("notice_outbox.next_attempt_at", 1), ("notice_outbox.event.event_id", 1)]
DISPATCH_ORDER = [("delivery.next_attempt_at", 1), ("event.event_id", 1)]
HEALTH_WINDOW = timedelta(seconds=30)
NonemptyText = Annotated[str, Field(min_length=1)]


class NoticeEvent(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)

    version: Annotated[int, Field(ge=1, le=1)]
    event_id: NonemptyText
    owner_id: NonemptyText
    mission_id: NonemptyText
    kind: Literal["result_ready", "needs_review"]
    created_at: datetime
    reason: Literal[
        "independent_verification_passed", "independent_verification_failed",
        "expired_lease_requires_reconciliation", "handler_outcome_requires_reconciliation",
    ]

    @field_validator("created_at")
    @classmethod
    def normalize_utc(cls, value):
        utc = value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
        return utc.replace(microsecond=utc.microsecond // 1000 * 1000)

    @model_validator(mode="after")
    def require_matching_kind(self):
        if NOTICE_KINDS[self.reason] != self.kind:
            raise ValueError("Notice kind and reason do not match")
        return self


class NoticeIntegrityError(RuntimeError):
    """A previously stored event ID refers to a different immutable payload."""


def notice_transition_pipeline(fields, *, reason, now):
    """Use one atomic mission update and derive identity from the live attempt."""
    kind = NOTICE_KINDS[reason]
    event_id = {"$concat": [
        {"$toString": {"$strLenCP": "$owner_id"}}, ":", "$owner_id",
        {"$toString": {"$strLenCP": "$mission_id"}}, ":", "$mission_id", ":", kind, ":",
        {"$toString": {"$ifNull": ["$attempts", 0]}},
    ]}
    return [{"$set": {
        **{name: {"$literal": value} for name, value in fields.items()},
        "notice_outbox": {
            "event": {"version": 1, "event_id": event_id, "owner_id": "$owner_id",
                      "mission_id": "$mission_id", "kind": kind, "created_at": now, "reason": reason},
            "next_attempt_at": now,
        },
    }}]


async def ensure_outbox_index(missions):
    await missions.create_index(NOTICE_ORDER, partialFilterExpression={
        "notice_outbox.next_attempt_at": {"$exists": True},
    })


async def ensure_inbox_index(inbox):
    await inbox.create_index([("owner_id", 1), ("event_id", 1)], unique=True)
    await inbox.create_index([("owner_id", 1), ("notice_id", 1)], unique=True)
    await inbox.create_index([("owner_id", 1), ("created_at", -1), ("event_id", -1)])
    await inbox.create_index([("owner_id", 1), ("read_at", 1), ("created_at", -1), ("event_id", -1)])
    await inbox.create_index("expires_at", expireAfterSeconds=0)


async def ensure_dispatch_index(dispatch):
    await dispatch.create_index(DISPATCH_ORDER, partialFilterExpression={
        "delivery.next_attempt_at": {"$exists": True},
    })


async def record_notice_poll(health, *, key, instance, at):
    # Write the identity and timestamp as one observation. A delayed process
    # may not pair its identity with a newer process's last-poll timestamp.
    previous = {"$ifNull": ["$last_poll_at", None]}
    newer = {"$or": [{"$eq": [previous, None]}, {"$gt": [at, previous]}]}
    await health.update_one({"_id": key}, [{"$set": {
        "last_poll_at": {"$max": [previous, at]},
        "instance": {"$cond": [newer, {"$literal": instance}, "$instance"]},
    }}], upsert=True)


async def notice_readiness(consumer_health, relay_health):
    consumer, relay = await asyncio.gather(
        consumer_health.find_one({"_id": "notice_consumer"}, {"last_poll_at": 1}),
        relay_health.find_one({"_id": "notice_relay"}, {"last_poll_at": 1}),
    )
    consumer_at = consumer["last_poll_at"].replace(tzinfo=timezone.utc) if consumer else None
    relay_at = relay["last_poll_at"].replace(tzinfo=timezone.utc) if relay else None
    now = datetime.now(timezone.utc)

    def recent(at):
        return at is not None and timedelta(0) <= now - at < HEALTH_WINDOW

    return {"ready": recent(consumer_at) and recent(relay_at), "last_poll_at": consumer_at,
            "relay_last_poll_at": relay_at}


async def insert_immutable_event(collection, key, fields, event: NoticeEvent):
    try:
        await collection.update_one(
            key, {"$setOnInsert": {**key, **fields, "event": event.model_dump()}},
            upsert=True,
        )
    except DuplicateKeyError:
        # A different consumer inserted this unique key concurrently.
        pass
    saved = await collection.find_one(key, {"_id": 0, "event": 1})
    if saved is None or NoticeEvent.model_validate(saved.get("event")) != event:
        raise NoticeIntegrityError("Stored event differs from the outbox event")


async def upsert_dispatch_entry(dispatch, event: NoticeEvent):
    key = {"_id": sha256(event.event_id.encode("utf-8")).hexdigest()}
    await insert_immutable_event(dispatch, key, {"delivery": {"next_attempt_at": event.created_at}}, event)


async def upsert_inbox_entry(inbox, event: NoticeEvent):
    key = {"owner_id": event.owner_id, "event_id": event.event_id}
    notice_id = sha256(event.event_id.encode("utf-8")).hexdigest()
    await insert_immutable_event(inbox, key, {"notice_id": notice_id, "created_at": event.created_at}, event)
