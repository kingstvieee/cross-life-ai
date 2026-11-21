"""Durable Guardian mission primitives. No external actions are executed here.

Use a MongoDB collection with unique indexes on (owner_id, mission_id) and
(owner_id, idempotency_key) for submissions. Worker claims are atomic.
"""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

TERMINAL = {"completed", "cancelled", "blocked"}


class MissionConflict(ValueError):
    """A submission key was reused with a different mission proposal."""


ALLOWED = {
    "proposed": {"approved", "cancelled"},
    "approved": {"queued", "cancelled"},
    "queued": {"leased", "cancelled"},
    "leased": {"running", "queued", "cancelled"},
    "running": {"verifying", "retry_wait", "awaiting_approval", "blocked"},
    "verifying": {"completed", "retry_wait", "blocked"},
    "retry_wait": {"queued", "blocked", "cancelled"},
    "awaiting_approval": {"queued", "cancelled"},
}

def now_utc():
    return datetime.now(timezone.utc)

def validate_transition(before, after, evidence=None):
    if after not in ALLOWED.get(before, set()):
        raise ValueError(f"Forbidden mission transition: {before} -> {after}")
    if after == "completed" and not (isinstance(evidence, dict) and evidence.get("verifier") == "independent" and evidence.get("passed") is True):
        raise ValueError("Completion requires independent verification evidence")

async def ensure_indexes(collection):
    await collection.create_index([("owner_id", 1), ("mission_id", 1)], unique=True)
    await collection.create_index([("owner_id", 1), ("idempotency_key", 1)], unique=True)
    await collection.create_index([("status", 1), ("lease_until", 1)])

async def submit_mission(collection, *, owner_id, objective, idempotency_key,
                         success_criteria, budget_cad=0):
    if not owner_id or not objective or not idempotency_key or not success_criteria:
        raise ValueError("Mission requires owner, objective, idempotency key and criteria")
    if budget_cad < 0:
        raise ValueError("Negative mission budget")
    doc = dict(owner_id=owner_id, mission_id=str(uuid4()), objective=objective,
               idempotency_key=idempotency_key, success_criteria=success_criteria,
               budget_cad=budget_cad, status="proposed", created_at=now_utc(),
               updated_at=now_utc(), lease_until=None, lease_token=None,
               checkpoint=None, evidence=None, attempts=0)
    # Duplicate submissions return the existing mission rather than executing twice.
    from pymongo.errors import DuplicateKeyError
    try:
        await collection.insert_one(doc)
    except DuplicateKeyError:
        existing = await collection.find_one(
            {"owner_id": owner_id, "idempotency_key": idempotency_key}, {"_id": 0})
        if existing is None:
            raise
        if any(existing.get(field) != doc[field]
               for field in ("objective", "success_criteria", "budget_cad")):
            raise MissionConflict("Submission key already belongs to a different proposal")
        return existing
    doc.pop("_id", None)
    return doc

async def transition(collection, *, owner_id, mission_id, expected, target,
                     evidence=None, checkpoint=None, lease_token=None):
    validate_transition(expected, target, evidence)
    query = {"owner_id": owner_id, "mission_id": mission_id, "status": expected}
    if expected in {"leased", "running", "verifying"}:
        if not lease_token:
            raise ValueError("Lease token required")
        query["lease_token"] = lease_token
        query["lease_until"] = {"$gt": now_utc()}
    update = {"status": target, "updated_at": now_utc()}
    if evidence is not None:
        update["evidence"] = evidence
    if checkpoint is not None:
        update["checkpoint"] = checkpoint
    if target in TERMINAL or target in {"queued", "retry_wait", "awaiting_approval"}:
        update["lease_until"] = None
        update["lease_token"] = None
        update["worker_id"] = None
    result = await collection.find_one_and_update(
        query, {"$set": update}, return_document=True)
    if result is None:
        raise RuntimeError("Mission changed concurrently or permission denied")
    result.pop("_id", None)
    return result

async def claim_mission(collection, *, worker_id, lease_seconds=60):
    if not worker_id or not 10 <= lease_seconds <= 3600:
        raise ValueError("Invalid worker lease")
    token = str(uuid4())
    now = now_utc()
    # A crashed worker's expired lease is requeued by a separate reconciler;
    # it must not be reclaimed while an active worker still holds it.
    return await collection.find_one_and_update(
        {"status": "queued", "lease_until": None,
         "$or": [{"not_before": {"$exists": False}},
                 {"not_before": {"$lte": now}}]},
        {"$set": {"status": "leased", "lease_token": token,
                  "worker_id": worker_id,
                  "lease_until": now + timedelta(seconds=lease_seconds),
                  "updated_at": now},
         "$inc": {"attempts": 1}},
        sort=[("created_at", 1)], return_document=True)

async def recover_expired_leases(collection):
    now = now_utc()
    # Only an unstarted lease can be retried automatically. Running or
    # verifying work may have performed an irreversible external effect;
    # quarantine those missions for reconciliation instead of replaying.
    unstarted = await collection.update_many(
        {"status": "leased", "lease_until": {"$lt": now}},
        {"$set": {"status": "queued", "lease_until": None,
                  "lease_token": None, "worker_id": None, "updated_at": now}})
    uncertain = await collection.update_many(
        {"status": {"$in": ["running", "verifying"]},
         "lease_until": {"$lt": now}},
        {"$set": {"status": "blocked", "lease_until": None,
                  "lease_token": None, "worker_id": None, "updated_at": now,
                  "recovery_reason": "expired_lease_requires_reconciliation"}})
    return {"requeued": unstarted.modified_count,
            "quarantined": uncertain.modified_count}

def authorize_action(*, approved, action_scope, granted_scopes, cost_cad, budget_cad):
    """Fail closed; this policy must be checked server-side at the tool boundary."""
    return bool(approved and action_scope in granted_scopes
                and 0 <= cost_cad <= budget_cad)

async def renew_lease(collection, *, owner_id, mission_id, lease_token, lease_seconds=60):
    """Extend an active worker lease only when its fencing token still matches."""
    if not owner_id or not mission_id or not lease_token or not 10 <= lease_seconds <= 3600:
        raise ValueError("Invalid lease renewal request")
    now = now_utc()
    result = await collection.find_one_and_update(
        {"owner_id": owner_id, "mission_id": mission_id,
         "status": {"$in": ["leased", "running", "verifying"]},
         "lease_token": lease_token, "lease_until": {"$gt": now}},
        {"$set": {"lease_until": now + timedelta(seconds=lease_seconds),
                  "updated_at": now}},
        return_document=True)
    if result is None:
        raise RuntimeError("Lease expired, revoked, or owned by another worker")
    result.pop("_id", None)
    return result
