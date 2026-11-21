"""Durable Guardian mission primitives. No external actions are executed here.

Use a MongoDB collection with unique indexes on (owner_id, mission_id) and
(owner_id, idempotency_key) for submissions. Worker claims are atomic.
"""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

TERMINAL = {"completed", "cancelled", "blocked"}
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
        return await collection.find_one(
            {"owner_id": owner_id, "idempotency_key": idempotency_key}, {"_id": 0})
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
    update = {"status": target, "updated_at": now_utc()}
    if evidence is not None:
        update["evidence"] = evidence
    if checkpoint is not None:
        update["checkpoint"] = checkpoint
    if target in TERMINAL:
        update["lease_until"] = None
        update["lease_token"] = None
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
        {"status": "queued", "lease_until": None},
        {"$set": {"status": "leased", "lease_token": token,
                  "worker_id": worker_id,
                  "lease_until": now + timedelta(seconds=lease_seconds),
                  "updated_at": now},
         "$inc": {"attempts": 1}},
        sort=[("created_at", 1)], return_document=True)

async def recover_expired_leases(collection):
    now = now_utc()
    return await collection.update_many(
        {"status": {"$in": ["leased", "running", "verifying"]}, "lease_until": {"$lt": now}},
        {"$set": {"status": "queued", "lease_until": None,
                  "lease_token": None, "worker_id": None, "updated_at": now}})

def authorize_action(*, approved, action_scope, granted_scopes, cost_cad, budget_cad):
    """Fail closed; this policy must be checked server-side at the tool boundary."""
    return bool(approved and action_scope in granted_scopes
                and 0 <= cost_cad <= budget_cad)
