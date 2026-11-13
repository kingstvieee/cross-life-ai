from copy import deepcopy
import pytest
from guardian_workflow import RSF_WORKFLOW_ID, new_workflow, render_status, _require_lease, _matching_grant, arbitrate_portal_weave


def test_manifest_is_not_workflow_completion():
    w = new_workflow()
    w["status"] = "completed"
    assert render_status(w, RSF_WORKFLOW_ID)["state"] == "reconciling"


@pytest.mark.parametrize("expiry", [None, "bad", "2000-01-01T00:00:00+00:00", "2099-01-01T00:00:00"])
def test_missing_malformed_naive_or_expired_lease_is_denied(expiry):
    w = new_workflow()
    w["lease"] = {"owner": "worker", "fence": 1, "expiresAt": expiry}
    with pytest.raises(ValueError, match="lease_expired"):
        _require_lease(w, "worker", 1)


def test_saved_scope_and_portal_removal_invalidates_unchanged_grant():
    w = new_workflow()
    g = {"grantId": "g", "version": 1, "state": "active", "scopes": ["read"], "portals": ["work"]}
    w["authority"].update({"scopes": ["read"], "portals": ["work"], "grants": [g]})
    a = {"grantId": "g", "version": 1, "portals": ["work"]}
    assert _matching_grant(w, a, scope="read")
    no_scope = deepcopy(w)
    no_scope["authority"]["scopes"] = []
    assert _matching_grant(no_scope, a, scope="read") is None
    w["authority"]["portals"] = []
    assert _matching_grant(w, a, scope="read") is None


def test_weave_revocation_removes_previously_contributed_context():
    w = new_workflow()
    w["authority"].update({"version": 1, "portals": ["work"], "portalGrants": [{"grantId": "g", "version": 1, "state": "active", "portals": ["work"]}]})
    w["portalWeave"]["contributions"] = [{"contributionId": "c", "portalId": "work", "authorityGrantId": "g", "state": "candidate", "privacyScope": "private", "version": "v10", "summary": "private"}]
    assert arbitrate_portal_weave(w, RSF_WORKFLOW_ID)["portalWeave"]["arbitration"]["selected"]
    w["authority"]["revoked"] = True
    assert arbitrate_portal_weave(w, RSF_WORKFLOW_ID)["portalWeave"]["arbitration"]["selected"] == []

def test_cancelled_worker_cannot_checkpoint_or_resume_work():
    from guardian_workflow import claim_lease, cancel, checkpoint, recover_worker
    w = claim_lease(new_workflow(), RSF_WORKFLOW_ID, owner="worker", fence=1)
    w = cancel(w, RSF_WORKFLOW_ID, owner="worker", fence=1, reason="stop")
    for operation in (
        lambda: checkpoint(w, RSF_WORKFLOW_ID, owner="worker", fence=1, checkpoint_id="late", summary="late", idempotency_key="late"),
        lambda: recover_worker(w, RSF_WORKFLOW_ID, owner="worker", fence=1),
    ):
        with pytest.raises(ValueError, match="workflow_cancelled"):
            operation()


def test_higher_fence_does_not_steal_live_lease():
    from guardian_workflow import claim_lease
    w = claim_lease(new_workflow(), RSF_WORKFLOW_ID, owner="worker-a", fence=1)
    with pytest.raises(ValueError, match="lease_held"):
        claim_lease(w, RSF_WORKFLOW_ID, owner="worker-b", fence=99)
