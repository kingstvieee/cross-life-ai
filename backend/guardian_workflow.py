"""Deterministic, backend-authoritative Guardian workflow contracts.

The workflow is deliberately provider-agnostic. External effects are represented as
at-least-once outbox work with an explicit persisted dispatch boundary. A provider
receipt is evidence of what a provider reported, not independent verification.
"""
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, time
from hashlib import sha256
import json
from typing import Any, Dict, Iterable, List, Mapping, Optional
from zoneinfo import ZoneInfo

RSF_WORKFLOW_ID = "rsf-fabric-sourcing"
WORKFLOW_STATUSES = ("ready", "leased", "checkpointed", "cancelled", "unknown", "reconciling", "completed")
PORTAL_DOMAINS = ("creativity", "work", "home", "wellbeing", "relationships", "community", "style")
PROACTIVE_TIMEZONE = "America/Toronto"

RSF_SOURCE_MANIFEST = {
    "manifestId": "rsf-fixture-manifest-v1",
    "version": "v1",
    "status": "fixture-only",
    "assets": [
        {"id": "fixture-fabric-brief", "kind": "brief", "label": "Founder-provided RSF material brief", "verified": True},
        {"id": "fixture-supplier-proof", "kind": "supplier-proof", "label": "Unavailable fixture placeholder; not supplier proof", "verified": False},
    ],
    "approvedFor": ["read-only review", "internal checkpoint drafting"],
    "notApprovedFor": ["source asset changes", "supplier contact", "purchase", "manufacturing readiness"],
}


@dataclass(frozen=True)
class WorkflowView:
    workflow_id: str
    status: str
    source_manifest: Mapping[str, Any]
    approvals: List[Mapping[str, Any]]
    checkpoints: List[Mapping[str, Any]]
    lease: Optional[Mapping[str, Any]]
    outbox: List[Mapping[str, Any]]
    cancellation: Optional[Mapping[str, Any]]
    evidence: List[Mapping[str, Any]]
    channels: Mapping[str, Any]
    worker: Mapping[str, Any]
    dispatches: List[Mapping[str, Any]]
    authority: Mapping[str, Any]
    portal_weave: Mapping[str, Any]
    provider_events: List[Mapping[str, Any]]


def new_workflow() -> Dict[str, Any]:
    return {
        "workflowId": RSF_WORKFLOW_ID,
        "status": "ready",
        "sourceManifest": deepcopy(RSF_SOURCE_MANIFEST),
        "approvals": [{"approvalId": "rsf-read-only-v1", "scope": "read-only review", "state": "approved"}],
        "checkpoints": [],
        "lease": None,
        "outbox": [],
        "cancellation": None,
        "evidence": [{"kind": "source-manifest", "state": "verified", "manifestId": RSF_SOURCE_MANIFEST["manifestId"]}],
        "channels": {
            "speech": {"state": "ready", "quiet": False, "requestVersion": 0},
            "conversation": {"state": "idle", "requestVersion": 0},
            "execution": {"state": "idle", "requestVersion": 0},
        },
        "proactiveConsent": {"greetings": False, "checkIns": False, "timezone": PROACTIVE_TIMEZONE, "beforeNoon": "silent"},
        "worker": {"state": "ready", "attempt": 0, "maxAttempts": 3, "lastError": None, "restartRecovered": False},
        "dispatches": [],
        "authority": {"version": 1, "scopes": [], "revoked": False},
        "portalWeave": {"contributions": [], "arbitration": None},
    }


def _require_workflow(workflow: Optional[Dict[str, Any]], workflow_id: str) -> Dict[str, Any]:
    if workflow_id != RSF_WORKFLOW_ID:
        raise KeyError("workflow_not_found")
    current = deepcopy(workflow or new_workflow())
    # Hydrate pre-v2.2 documents without changing their existing behavior.
    base = new_workflow()
    for key, value in base.items():
        current.setdefault(key, deepcopy(value))
    return current


def _approved(workflow: Dict[str, Any], scope: str) -> bool:
    return any(item.get("scope") == scope and item.get("state") == "approved" for item in workflow["approvals"])


def _require_lease(workflow: Dict[str, Any], owner: str, fence: int) -> None:
    lease = workflow.get("lease") or {}
    if lease.get("owner") != owner or int(lease.get("fence", -1)) != int(fence):
        raise ValueError("stale_or_missing_lease")


def _canonical_hash(payload: Mapping[str, Any]) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    return sha256(encoded).hexdigest()


def claim_lease(workflow: Optional[Dict[str, Any]], workflow_id: str, *, owner: str, fence: int) -> Dict[str, Any]:
    current = _require_workflow(workflow, workflow_id)
    if not owner.strip():
        raise ValueError("lease_owner_required")
    if current.get("status") == "cancelled":
        raise ValueError("workflow_cancelled")
    if (current.get("cancellation") or {}).get("state") == "requested":
        raise ValueError("workflow_cancellation_requested")
    existing = current.get("lease")
    if existing and existing.get("owner") != owner and int(existing.get("fence", 0)) >= fence:
        raise ValueError("lease_held")
    current["lease"] = {"owner": owner, "fence": int(fence), "state": "active"}
    current["status"] = "leased"
    current["worker"].update({"state": "leased", "attempt": int(current["worker"].get("attempt", 0)) + 1, "restartRecovered": False})
    return current


def mark_worker_retry(workflow: Optional[Dict[str, Any]], workflow_id: str, *, owner: str, fence: int, error: str) -> Dict[str, Any]:
    current = _require_workflow(workflow, workflow_id)
    _require_lease(current, owner, fence)
    worker = current["worker"]
    if int(worker.get("attempt", 0)) >= int(worker.get("maxAttempts", 3)):
        worker.update({"state": "blocked", "lastError": error.strip()})
        return current
    worker.update({"state": "retry_waiting", "lastError": error.strip()})
    current["execution"] = current["channels"]["execution"]
    current["channels"]["execution"].update({"state": "retry_waiting"})
    return current


def recover_worker(workflow: Optional[Dict[str, Any]], workflow_id: str, *, owner: str, fence: int) -> Dict[str, Any]:
    current = _require_workflow(workflow, workflow_id)
    _require_lease(current, owner, fence)
    current["worker"].update({"state": "leased", "restartRecovered": True})
    current["channels"]["execution"].update({"state": "running"})
    return current


def checkpoint(workflow: Optional[Dict[str, Any]], workflow_id: str, *, owner: str, fence: int, checkpoint_id: str, summary: str, idempotency_key: str) -> Dict[str, Any]:
    current = _require_workflow(workflow, workflow_id)
    if not _approved(current, "read-only review"):
        raise ValueError("source_approval_required")
    _require_lease(current, owner, fence)
    if not checkpoint_id.strip() or not idempotency_key.strip():
        raise ValueError("checkpoint_identity_required")
    if any(item.get("idempotencyKey") == idempotency_key for item in current["checkpoints"]):
        return current
    current["checkpoints"].append({"checkpointId": checkpoint_id, "summary": summary.strip(), "idempotencyKey": idempotency_key, "state": "recorded", "sourceManifestId": current["sourceManifest"]["manifestId"]})
    current["outbox"].append({"idempotencyKey": idempotency_key, "effect": "internal-report", "state": "queued", "verified": False, "delivery": "at-least-once"})
    current["status"] = "checkpointed"
    return current


def set_speech_quiet(workflow: Optional[Dict[str, Any]], workflow_id: str, *, quiet: bool) -> Dict[str, Any]:
    current = _require_workflow(workflow, workflow_id)
    speech = current["channels"]["speech"]
    speech.update({"quiet": bool(quiet), "state": "quiet" if quiet else "ready", "requestVersion": int(speech.get("requestVersion", 0)) + 1})
    # Quiet fences pending audio only. Conversation and execution are intentionally untouched.
    return current


def set_proactive_consent(workflow: Optional[Dict[str, Any]], workflow_id: str, *, greetings: bool, check_ins: bool) -> Dict[str, Any]:
    current = _require_workflow(workflow, workflow_id)
    current["proactiveConsent"].update({"greetings": bool(greetings), "checkIns": bool(check_ins), "timezone": PROACTIVE_TIMEZONE, "beforeNoon": "silent"})
    return current


def proactive_decision(workflow: Optional[Dict[str, Any]], workflow_id: str, *, kind: str, at: datetime) -> Dict[str, Any]:
    current = _require_workflow(workflow, workflow_id)
    if kind not in ("greetings", "checkIns"):
        raise ValueError("invalid_proactive_kind")
    local = at.astimezone(ZoneInfo(PROACTIVE_TIMEZONE))
    consented = bool(current["proactiveConsent"].get(kind))
    allowed = consented and local.time() >= time(12, 0)
    return {"kind": kind, "allowed": allowed, "reason": "consent_and_after_noon" if allowed else ("before_noon_quiet" if local.time() < time(12, 0) else "proactive_consent_required"), "timezone": PROACTIVE_TIMEZONE, "localTime": local.isoformat()}


def _valid_authority(current: Dict[str, Any], authority: Mapping[str, Any], *, scope: str) -> bool:
    saved = current.get("authority") or {}
    return bool(authority and not authority.get("revoked") and int(authority.get("version", -1)) == int(saved.get("version", 0)) and scope in set(authority.get("scopes", [])))


def revoke_authority(workflow: Optional[Dict[str, Any]], workflow_id: str, *, reason: str) -> Dict[str, Any]:
    current = _require_workflow(workflow, workflow_id)
    current["authority"].update({"version": int(current["authority"].get("version", 0)) + 1, "revoked": True, "reason": reason.strip()})
    return current


def dispatch(workflow: Optional[Dict[str, Any]], workflow_id: str, *, owner: str, fence: int, action: str, action_version: str, authority: Mapping[str, Any], context: Mapping[str, Any], idempotency_key: str) -> Dict[str, Any]:
    current = _require_workflow(workflow, workflow_id)
    _require_lease(current, owner, fence)
    if current.get("status") == "cancelled":
        raise ValueError("workflow_cancelled")
    if (current.get("cancellation") or {}).get("state") == "requested":
        raise ValueError("workflow_cancellation_requested")
    if not action.strip() or not action_version.strip() or not idempotency_key.strip():
        raise ValueError("dispatch_identity_required")
    if not _valid_authority(current, authority, scope="execute"):
        raise ValueError("authority_revoked_or_stale")
    safe_context = filter_context(context, allowed_portals=authority.get("portals", []), private=True)
    action_hash = _canonical_hash({"action": action.strip(), "version": action_version.strip(), "context": safe_context})
    for item in current["dispatches"]:
        if item.get("idempotencyKey") == idempotency_key:
            return current
    dispatch_id = f"dispatch:{idempotency_key}"
    boundary = {"dispatchId": dispatch_id, "idempotencyKey": idempotency_key, "state": "persisted", "sentAt": None, "cannotRecall": True}
    current["dispatches"].append({"dispatchId": dispatch_id, "idempotencyKey": idempotency_key, "action": action.strip(), "actionVersion": action_version.strip(), "actionHash": action_hash, "authorityVersion": int(authority["version"]), "authorityScopes": sorted(authority.get("scopes", [])), "context": safe_context, "boundary": boundary, "state": "queued"})
    current["outbox"].append({"idempotencyKey": idempotency_key, "dispatchId": dispatch_id, "effect": "external-operation", "state": "queued", "verified": False, "delivery": "at-least-once", "requiresReadAuthority": True})
    current["channels"]["execution"].update({"state": "running", "requestVersion": int(current["channels"]["execution"].get("requestVersion", 0)) + 1})
    current["worker"].update({"state": "running"})
    return current


def mark_sent(workflow: Optional[Dict[str, Any]], workflow_id: str, *, idempotency_key: str) -> Dict[str, Any]:
    current = _require_workflow(workflow, workflow_id)
    matches = [item for item in current["dispatches"] if item.get("idempotencyKey") == idempotency_key]
    if not matches:
        raise ValueError("dispatch_not_found")
    for item in matches:
        item["state"] = "sent"
        item["boundary"].update({"state": "sent", "sentAt": datetime.now().astimezone().isoformat(), "cannotRecall": True})
    return current


def request_operation_cancellation(workflow: Optional[Dict[str, Any]], workflow_id: str, *, idempotency_key: str, reason: str) -> Dict[str, Any]:
    current = _require_workflow(workflow, workflow_id)
    target = next((item for item in current["dispatches"] if item.get("idempotencyKey") == idempotency_key), None)
    if not target:
        raise ValueError("dispatch_not_found")
    current["cancellation"] = {"kind": "operation-request", "idempotencyKey": idempotency_key, "reason": reason.strip(), "state": "requested", "cannotRecall": bool(target["boundary"].get("cannotRecall"))}
    current["outbox"].append({"idempotencyKey": f"cancel-request:{idempotency_key}", "effect": "operation-cancellation-request", "state": "queued", "verified": False, "delivery": "at-least-once"})
    return current


def cancel(workflow: Optional[Dict[str, Any]], workflow_id: str, *, owner: str, fence: int, reason: str) -> Dict[str, Any]:
    """Cancel the Guardian task, not a possibly-sent external operation."""
    current = _require_workflow(workflow, workflow_id)
    _require_lease(current, owner, fence)
    in_flight = any(item.get("state") in ("queued", "sent", "provider-reported-success", "reconciling") for item in current["dispatches"])
    current["cancellation"] = {"kind": "guardian-task", "requestedBy": owner, "fence": int(fence), "reason": reason.strip(), "state": "requested", "requiresReconciliation": in_flight}
    current["status"] = "reconciling" if in_flight else "cancelled"
    current["channels"]["execution"].update({"state": "reconciling" if in_flight else "cancelled", "requestVersion": int(current["channels"]["execution"].get("requestVersion", 0)) + 1})
    current["worker"].update({"state": "reconciling" if in_flight else "cancelled"})
    if not in_flight:
        current["cancellation"].update({"state": "verified", "evidence": {"kind": "task-cancellation", "effect": "no-dispatch-in-flight"}})
        current["evidence"].append({"kind": "task-cancellation", "state": "verified", "reason": "no-dispatch-in-flight"})
    current["outbox"].append({"idempotencyKey": f"cancel:{workflow_id}:{fence}", "effect": "cancel-guardian-task", "state": "queued", "verified": False, "delivery": "at-least-once"})
    return current


def record_provider_event(workflow: Optional[Dict[str, Any]], workflow_id: str, *, event_id: str, idempotency_key: str, outcome: str, receipt: Mapping[str, Any]) -> Dict[str, Any]:
    current = _require_workflow(workflow, workflow_id)
    if outcome not in ("accepted", "rejected", "success", "failure"):
        raise ValueError("invalid_provider_outcome")
    events = current.setdefault("providerEvents", [])
    if any(item.get("eventId") == event_id for item in events):
        return current
    target = next((item for item in current["dispatches"] if item.get("idempotencyKey") == idempotency_key), None)
    if not target:
        raise ValueError("dispatch_not_found")
    events.append({"eventId": event_id, "idempotencyKey": idempotency_key, "outcome": outcome, "receipt": dict(receipt), "evidenceType": "provider-receipt", "independentVerification": False})
    if outcome == "success" and target.get("state") in ("sent", "queued"):
        target["state"] = "provider-reported-success"
    return current


def reconcile(workflow: Optional[Dict[str, Any]], workflow_id: str, *, idempotency_key: str, outcome: str, evidence: Mapping[str, Any], authority: Optional[Mapping[str, Any]] = None) -> Dict[str, Any]:
    current = _require_workflow(workflow, workflow_id)
    if outcome not in ("verified", "unknown", "rejected"):
        raise ValueError("invalid_reconciliation_outcome")
    matches = [item for item in current["outbox"] if item.get("idempotencyKey") == idempotency_key]
    if not matches:
        raise ValueError("outbox_item_not_found")
    requires_read = any(bool(item.get("requiresReadAuthority")) for item in matches)
    if requires_read and not _valid_authority(current, authority or {}, scope="read"):
        raise ValueError("read_authority_required")
    for item in matches:
        item.update({"state": outcome, "verified": outcome == "verified", "evidence": dict(evidence), "evidenceType": "independent-read" if outcome == "verified" else "reconciliation-record"})
    current["evidence"].append({"kind": "effect-reconciliation", "idempotencyKey": idempotency_key, "state": outcome, "evidence": dict(evidence), "authorityVersion": (authority or {}).get("version")})
    dispatch_item = next((item for item in current["dispatches"] if item.get("idempotencyKey") == idempotency_key), None)
    if dispatch_item:
        dispatch_item["state"] = "verified" if outcome == "verified" else ("rejected" if outcome == "rejected" else "reconciling")
    cancellation = current.get("cancellation") or {}
    if cancellation.get("kind") == "guardian-task" and cancellation.get("state") == "requested":
        if outcome == "verified":
            current["cancellation"].update({"state": "verified", "evidence": dict(evidence)})
            current["status"] = "cancelled"
            current["channels"]["execution"]["state"] = "cancelled"
        elif outcome in ("unknown", "rejected"):
            current["cancellation"].update({"state": "reconciling", "blocker": "cancellation_effect_not_verified"})
    if outcome == "unknown":
        current["status"] = "reconciling" if dispatch_item else "unknown"
    return current


def add_portal_contribution(workflow: Optional[Dict[str, Any]], workflow_id: str, *, contribution_id: str, portal_id: str, kind: str, summary: str, version: str, privacy_scope: str, authority_scopes: Iterable[str], idempotency_key: str) -> Dict[str, Any]:
    current = _require_workflow(workflow, workflow_id)
    if portal_id not in PORTAL_DOMAINS:
        raise ValueError("unknown_portal")
    if not all(str(value).strip() for value in (contribution_id, kind, summary, version, privacy_scope, idempotency_key)):
        raise ValueError("contribution_identity_required")
    if portal_id not in set(authority_scopes):
        raise ValueError("portal_scope_required")
    contributions = current["portalWeave"]["contributions"]
    if any(item.get("idempotencyKey") == idempotency_key for item in contributions):
        return current
    contributions.append({"contributionId": contribution_id, "portalId": portal_id, "kind": kind, "summary": summary.strip(), "version": version, "privacyScope": privacy_scope, "idempotencyKey": idempotency_key, "state": "candidate"})
    return current


def arbitrate_portal_weave(workflow: Optional[Dict[str, Any]], workflow_id: str) -> Dict[str, Any]:
    current = _require_workflow(workflow, workflow_id)
    candidates = current["portalWeave"]["contributions"]
    selected: List[Mapping[str, Any]] = []
    for portal_id in PORTAL_DOMAINS:
        portal_items = sorted((item for item in candidates if item.get("portalId") == portal_id), key=lambda item: (item.get("version", ""), item.get("contributionId", "")))
        if portal_items:
            selected.append(portal_items[-1])
    current["portalWeave"]["arbitration"] = {"state": "prepared", "domains": list(PORTAL_DOMAINS), "selected": deepcopy(selected), "conflicts": [], "execution": "not_requested"}
    return current


def filter_context(context: Mapping[str, Any], *, allowed_portals: Iterable[str], private: bool) -> Dict[str, Any]:
    allowed = {str(item).lower() for item in allowed_portals}
    safe: Dict[str, Any] = {"portals": sorted(allowed), "private": bool(private)}
    portal_data = context.get("portals", {})
    safe["context"] = {str(key): deepcopy(value) for key, value in portal_data.items() if str(key).lower() in allowed}
    for key in ("identity", "guestStatus", "presence", "health", "credentials", "rawPrompt", "accessToken", "email", "phone"):
        safe.pop(key, None)
    return safe


def select_portals(*, requested: str, candidates: Iterable[str], limit: int = 2) -> List[str]:
    normalized = [str(item) for item in candidates]
    terms = {part.lower() for part in requested.split() if part.strip()}
    ranked = sorted(normalized, key=lambda item: (0 if item.lower() in terms else 1, item.lower()))
    return ranked[: max(1, min(limit, len(ranked)))]


STATUS_TEMPLATES = {
    "ready": "Ready—not started.",
    "leased": "In progress; the outcome is not yet verified.",
    "checkpointed": "In progress; the outcome is not yet verified.",
    "unknown": "Outcome uncertain. Further checking is required before completion can be claimed.",
    "reconciling": "Outcome uncertain. Further checking is required before completion can be claimed.",
    "cancelled": "Guardian's task was stopped; its intended effect did not occur.",
    "completed": "The workflow completed successfully.",
}


def render_status(workflow: Optional[Dict[str, Any]], workflow_id: str, *, requested_text: Optional[str] = None) -> Dict[str, Any]:
    """Render from canonical backend state; ignore model/caller-written completion text."""
    current = _require_workflow(workflow, workflow_id)
    status = current.get("status", "ready")
    if status == "completed" and not any(item.get("state") == "verified" for item in current.get("evidence", [])):
        status = "reconciling"
    if status == "cancelled" and (current.get("cancellation") or {}).get("state") != "verified":
        status = "reconciling"
    return {"workflowId": workflow_id, "state": status, "text": STATUS_TEMPLATES[status], "modelTextIgnored": bool(requested_text)}


def view(workflow: Optional[Dict[str, Any]], workflow_id: str) -> WorkflowView:
    current = _require_workflow(workflow, workflow_id)
    return WorkflowView(current["workflowId"], current["status"], current["sourceManifest"], current["approvals"], current["checkpoints"], current["lease"], current["outbox"], current["cancellation"], current["evidence"], current["channels"], current["worker"], current["dispatches"], current["authority"], current["portalWeave"], current.get("providerEvents", []))
