import asyncio

import pytest

from guardian_store import GuardianStore
from guardian_workflow import filter_context, select_portals
from test_guardian_store import FakeCollection


def run(coro):
    return asyncio.run(coro)


def test_rsf_workflow_is_read_only_fixture_scoped_and_replay_safe():
    store = GuardianStore(FakeCollection())
    initial = run(store.get_workflow("user-a", "rsf-fabric-sourcing"))
    assert initial["source_manifest"]["status"] == "fixture-only"
    assert "source asset changes" in initial["source_manifest"]["notApprovedFor"]

    leased = run(store.claim_workflow_lease("user-a", "rsf-fabric-sourcing", owner="worker-a", fence=1))
    recorded = run(store.record_workflow_checkpoint("user-a", "rsf-fabric-sourcing", owner="worker-a", fence=1, checkpoint_id="brief-review", summary="Reviewed the founder brief only.", idempotency_key="rsf:brief-review:v1"))
    replay = run(store.record_workflow_checkpoint("user-a", "rsf-fabric-sourcing", owner="worker-a", fence=1, checkpoint_id="brief-review", summary="Should not duplicate.", idempotency_key="rsf:brief-review:v1"))
    assert leased["lease"]["fence"] == 1
    assert len(recorded["checkpoints"]) == len(replay["checkpoints"]) == 1
    assert replay["outbox"][0]["state"] == "queued"


def test_stale_lease_cancel_and_unknown_effect_are_truthful():
    store = GuardianStore(FakeCollection())
    run(store.claim_workflow_lease("user-a", "rsf-fabric-sourcing", owner="worker-a", fence=2))
    with pytest.raises(ValueError, match="stale_or_missing_lease"):
        run(store.record_workflow_checkpoint("user-a", "rsf-fabric-sourcing", owner="worker-a", fence=1, checkpoint_id="stale", summary="No", idempotency_key="stale"))
    run(store.record_workflow_checkpoint("user-a", "rsf-fabric-sourcing", owner="worker-a", fence=2, checkpoint_id="brief", summary="Read-only.", idempotency_key="brief"))
    cancelled = run(store.cancel_workflow("user-a", "rsf-fabric-sourcing", owner="worker-a", fence=2, reason="Founder review paused."))
    assert cancelled["status"] == "cancelled"
    with pytest.raises(ValueError, match="workflow_cancelled"):
        run(store.claim_workflow_lease("user-a", "rsf-fabric-sourcing", owner="worker-b", fence=3))
    reconciled = run(store.reconcile_workflow("user-a", "rsf-fabric-sourcing", idempotency_key="brief", outcome="unknown", evidence={"receipt": "not available"}))
    assert reconciled["status"] == "unknown"
    assert reconciled["outbox"][0]["verified"] is False


def test_context_filter_and_portal_selection_are_minimal_and_deterministic():
    safe = filter_context({"portals": {"Work": {"title": "ok"}, "Home": {"secret": True}}, "identity": "hidden", "presence": True}, allowed_portals=["Work"], private=True)
    assert list(safe["context"]) == ["Work"]
    assert "identity" not in safe and "presence" not in safe
    assert select_portals(requested="work planning", candidates=["Style", "Work", "Home"], limit=2) == ["Work", "Home"]
