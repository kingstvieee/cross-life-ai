"""A zero-cost Guardian mission that runs entirely within the mission store."""
from datetime import timezone

from guardian_mission_engine import MissionConflict, now_utc
from guardian_verifier import canonical_digest

PREVIEW_HANDLER = "mission_preview"
PREVIEW_APPROVAL_FIELDS = ("objective", "success_criteria", "budget_cad", "expires_at")


def utc_datetime(value):
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def bson_datetime(value):
    value = utc_datetime(value)
    return value.replace(microsecond=value.microsecond // 1000 * 1000)


def preview_digest(mission):
    fields = {field: mission.get(field) for field in PREVIEW_APPROVAL_FIELDS}
    if fields["expires_at"] is not None:
        fields["expires_at"] = utc_datetime(fields["expires_at"]).isoformat()
    return canonical_digest(fields)


async def queue_preview(collection, *, owner_id, mission_id, digest, run_at=None):
    query = {"owner_id": owner_id, "mission_id": mission_id}
    mission = await collection.find_one(query)
    if mission is None:
        return None
    if run_at is not None:
        run_at = bson_datetime(run_at)
    existing = mission.get("preview_approval")
    if existing:
        saved = existing.get("requested_run_at")
        if saved is not None:
            saved = utc_datetime(saved)
        if existing["digest"] == digest and saved == run_at:
            return mission
        raise MissionConflict("Preview schedule already exists")
    if mission.get("status") != "proposed" or preview_digest(mission) != digest:
        raise MissionConflict("Mission proposal changed")

    now = bson_datetime(now_utc())
    start = max(now, run_at) if run_at is not None else now
    deadline = mission.get("expires_at")
    if deadline is not None and utc_datetime(deadline) <= start:
        raise MissionConflict("Preview cannot start before the mission deadline")
    # Bind the owner's review to the exact proposal and atomically enqueue.
    query.update({field: mission.get(field) for field in PREVIEW_APPROVAL_FIELDS})
    query.update({"status": "proposed", "preview_approval": None})
    updated = await collection.find_one_and_update(
        query,
        {"$set": {
            "status": "queued", "handler": PREVIEW_HANDLER, "approved": True,
            "granted_scopes": [PREVIEW_HANDLER], "estimated_cost_cad": 0,
            "not_before": start, "updated_at": now,
            "preview_approval": {
                "digest": digest, "requested_run_at": run_at, "approved_at": now,
            },
        }},
        return_document=True,
    )
    if updated is not None:
        return updated
    # A concurrent identical submission may have won the compare-and-swap.
    current = await collection.find_one({"owner_id": owner_id, "mission_id": mission_id})
    approval = (current or {}).get("preview_approval") or {}
    saved = approval.get("requested_run_at")
    if saved is not None:
        saved = utc_datetime(saved)
    if approval.get("digest") == digest and saved == run_at:
        return current
    raise MissionConflict("Mission changed concurrently")


async def execute_preview(mission):
    if (mission.get("estimated_cost_cad") != 0 or
            mission.get("preview_approval", {}).get("digest") != preview_digest(mission)):
        raise MissionConflict("Preview approval is invalid")
    return {
        "kind": PREVIEW_HANDLER,
        "mission_id": mission["mission_id"],
        "proposal_digest": preview_digest(mission),
        "objective": mission["objective"],
        "success_criteria": mission["success_criteria"],
    }


async def verify_preview(mission):
    result = (mission.get("checkpoint") or {}).get("result")
    approval = (mission.get("preview_approval") or {}).get("digest")
    return result == {
        "kind": PREVIEW_HANDLER,
        "mission_id": mission["mission_id"],
        "proposal_digest": preview_digest(mission),
        "objective": mission["objective"],
        "success_criteria": mission["success_criteria"],
    } and approval == preview_digest(mission) and mission.get("estimated_cost_cad") == 0
