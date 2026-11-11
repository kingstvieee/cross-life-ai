"""Deterministic Guardian workflow primitives for the first authorized RSF read-only flow.

This module deliberately does not fetch suppliers, mutate source assets, or claim
manufacturing readiness. It provides typed state transitions for the authenticated
store and keeps all external effects represented as pending/unknown until verified.
"""
from copy import deepcopy
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Mapping, Optional

RSF_WORKFLOW_ID = "rsf-fabric-sourcing"
WORKFLOW_STATUSES = ("ready", "leased", "checkpointed", "cancelled", "unknown")

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
    }


def _require_workflow(workflow: Optional[Dict[str, Any]], workflow_id: str) -> Dict[str, Any]:
    if workflow_id != RSF_WORKFLOW_ID:
        raise KeyError("workflow_not_found")
    return deepcopy(workflow or new_workflow())


def _approved(workflow: Dict[str, Any], scope: str) -> bool:
    return any(item.get("scope") == scope and item.get("state") == "approved" for item in workflow["approvals"])


def claim_lease(workflow: Optional[Dict[str, Any]], workflow_id: str, *, owner: str, fence: int) -> Dict[str, Any]:
    current = _require_workflow(workflow, workflow_id)
    if not owner.strip():
        raise ValueError("lease_owner_required")
    if current.get("status") == "cancelled":
        raise ValueError("workflow_cancelled")
    existing = current.get("lease")
    if existing and existing.get("owner") != owner and int(existing.get("fence", 0)) >= fence:
        raise ValueError("lease_held")
    current["lease"] = {"owner": owner, "fence": int(fence), "state": "active"}
    current["status"] = "leased"
    return current


def checkpoint(
    workflow: Optional[Dict[str, Any]],
    workflow_id: str,
    *,
    owner: str,
    fence: int,
    checkpoint_id: str,
    summary: str,
    idempotency_key: str,
) -> Dict[str, Any]:
    current = _require_workflow(workflow, workflow_id)
    if not _approved(current, "read-only review"):
        raise ValueError("source_approval_required")
    lease = current.get("lease") or {}
    if lease.get("owner") != owner or int(lease.get("fence", -1)) != int(fence):
        raise ValueError("stale_or_missing_lease")
    if not checkpoint_id.strip() or not idempotency_key.strip():
        raise ValueError("checkpoint_identity_required")
    if any(item.get("idempotencyKey") == idempotency_key for item in current["checkpoints"]):
        return current
    current["checkpoints"].append({"checkpointId": checkpoint_id, "summary": summary.strip(), "idempotencyKey": idempotency_key, "state": "recorded", "sourceManifestId": current["sourceManifest"]["manifestId"]})
    current["outbox"].append({"idempotencyKey": idempotency_key, "effect": "internal-report", "state": "queued", "verified": False})
    current["status"] = "checkpointed"
    return current


def cancel(workflow: Optional[Dict[str, Any]], workflow_id: str, *, owner: str, fence: int, reason: str) -> Dict[str, Any]:
    current = _require_workflow(workflow, workflow_id)
    lease = current.get("lease") or {}
    if lease.get("owner") != owner or int(lease.get("fence", -1)) != int(fence):
        raise ValueError("stale_or_missing_lease")
    current["cancellation"] = {"requestedBy": owner, "fence": int(fence), "reason": reason.strip(), "state": "requested"}
    current["status"] = "cancelled"
    current["outbox"].append({"idempotencyKey": f"cancel:{workflow_id}:{fence}", "effect": "cancel-work", "state": "queued", "verified": False})
    return current


def reconcile(workflow: Optional[Dict[str, Any]], workflow_id: str, *, idempotency_key: str, outcome: str, evidence: Mapping[str, Any]) -> Dict[str, Any]:
    current = _require_workflow(workflow, workflow_id)
    if outcome not in ("verified", "unknown", "rejected"):
        raise ValueError("invalid_reconciliation_outcome")
    matches = [item for item in current["outbox"] if item.get("idempotencyKey") == idempotency_key]
    if not matches:
        raise ValueError("outbox_item_not_found")
    for item in matches:
        item.update({"state": outcome, "verified": outcome == "verified", "evidence": dict(evidence)})
    current["evidence"].append({"kind": "effect-reconciliation", "idempotencyKey": idempotency_key, "state": outcome, "evidence": dict(evidence)})
    if outcome == "unknown":
        current["status"] = "unknown"
    return current


def filter_context(context: Mapping[str, Any], *, allowed_portals: Iterable[str], private: bool) -> Dict[str, Any]:
    allowed = {str(item).lower() for item in allowed_portals}
    safe: Dict[str, Any] = {"portals": sorted(allowed), "private": bool(private)}
    portal_data = context.get("portals", {})
    safe["context"] = {str(key): deepcopy(value) for key, value in portal_data.items() if str(key).lower() in allowed}
    for key in ("identity", "guestStatus", "presence", "health", "credentials", "rawPrompt"):
        safe.pop(key, None)
    return safe


def select_portals(*, requested: str, candidates: Iterable[str], limit: int = 2) -> List[str]:
    """Deterministic minimal selection; model text cannot expand permissions."""
    normalized = [str(item) for item in candidates]
    terms = {part.lower() for part in requested.split() if part.strip()}
    ranked = sorted(normalized, key=lambda item: (0 if item.lower() in terms else 1, item.lower()))
    return ranked[: max(1, min(limit, len(ranked)))]


def view(workflow: Optional[Dict[str, Any]], workflow_id: str) -> WorkflowView:
    current = _require_workflow(workflow, workflow_id)
    return WorkflowView(current["workflowId"], current["status"], current["sourceManifest"], current["approvals"], current["checkpoints"], current["lease"], current["outbox"], current["cancellation"], current["evidence"])
