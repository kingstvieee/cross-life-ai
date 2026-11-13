import asyncio
from datetime import datetime, timezone

import pytest

from guardian_store import GuardianStore
from test_guardian_store import FakeCollection


WORKFLOW = "rsf-fabric-sourcing"
AUTH = {"version": 1, "scopes": ["execute", "read"], "revoked": False, "portals": ["work", "style"]}


def run(coro):
    return asyncio.run(coro)


def leased_store():
    store = GuardianStore(FakeCollection())
    run(store.claim_workflow_lease("user-a", WORKFLOW, owner="worker-a", fence=1))
    return store


def dispatch(store, key="op-1"):
    return run(store.dispatch_workflow(
        "user-a", WORKFLOW, owner="worker-a", fence=1,
        action="prepare supplier review", action_version="v2",
        authority=AUTH, context={"portals": {"work": {"title": "safe"}, "home": {"private": "drop"}}, "identity": "drop"},
        idempotency_key=key,
    ))


def test_quiet_only_fences_speech_and_execution_continues():
    store = leased_store()
    running = dispatch(store)
    quiet = run(store.set_speech_quiet("user-a", WORKFLOW, quiet=True))
    assert quiet["channels"]["speech"]["state"] == "quiet"
    assert quiet["channels"]["execution"]["state"] == "running"
    assert quiet["dispatches"][0]["state"] == "queued"
    assert running["dispatches"][0]["actionHash"]


def test_proactive_consent_and_before_noon_toronto_policy():
    store = leased_store()
    run(store.set_proactive_consent("user-a", WORKFLOW, greetings=True, check_ins=True))
    before_noon = run(store.proactive_decision("user-a", WORKFLOW, kind="greetings", at=datetime(2026, 11, 12, 16, 0, tzinfo=timezone.utc)))
    after_noon = run(store.proactive_decision("user-a", WORKFLOW, kind="greetings", at=datetime(2026, 11, 12, 18, 0, tzinfo=timezone.utc)))
    assert before_noon["allowed"] is False
    assert before_noon["reason"] == "before_noon_quiet"
    assert after_noon["allowed"] is True


def test_stale_and_revoked_authority_cannot_dispatch():
    store = leased_store()
    stale = {**AUTH, "version": 0}
    with pytest.raises(ValueError, match="authority_revoked_or_stale"):
        dispatch_kwargs = dict(owner="worker-a", fence=1, action="send", action_version="v2", authority=stale, context={}, idempotency_key="stale")
        run(store.dispatch_workflow("user-a", WORKFLOW, **dispatch_kwargs))
    run(store.revoke_workflow_authority("user-a", WORKFLOW, reason="Founder revoked scope"))
    with pytest.raises(ValueError, match="authority_revoked_or_stale"):
        dispatch(store, "revoked")


def test_dispatch_boundary_unknown_requires_read_authority_and_cannot_be_forged_complete():
    store = leased_store()
    dispatch(store)
    run(store.mark_workflow_sent("user-a", WORKFLOW, idempotency_key="op-1"))
    with pytest.raises(ValueError, match="read_authority_required"):
        run(store.reconcile_workflow_with_authority("user-a", WORKFLOW, authority={"version": 1, "scopes": ["execute"], "revoked": False}, idempotency_key="op-1", outcome="unknown", evidence={"claim": "done"}))
    reconciling = run(store.reconcile_workflow_with_authority("user-a", WORKFLOW, authority=AUTH, idempotency_key="op-1", outcome="unknown", evidence={"source": "no-read"}))
    assert reconciling["status"] == "reconciling"
    assert reconciling["dispatches"][0]["state"] == "reconciling"
    assert not reconciling["outbox"][0]["verified"]


def test_in_flight_task_cancellation_stays_reconciling_until_evidence_arrives():
    store = leased_store()
    dispatch(store)
    requested = run(store.cancel_workflow("user-a", WORKFLOW, owner="worker-a", fence=1, reason="Stop before another effect."))
    assert requested["status"] == "reconciling"
    assert requested["cancellation"]["state"] == "requested"
    assert requested["cancellation"]["requiresReconciliation"] is True
    assert "cancelled" not in run(store.render_workflow_status("user-a", WORKFLOW, requested_text="Done"))["text"].lower()
    verified = run(store.reconcile_workflow_with_authority("user-a", WORKFLOW, authority=AUTH, idempotency_key="op-1", outcome="verified", evidence={"source": "independent-read", "effect": "none"}))
    assert verified["status"] == "cancelled"
    assert verified["cancellation"]["state"] == "verified"


def test_duplicate_provider_event_and_late_success_are_not_exactly_once_or_verified():
    store = leased_store()
    dispatch(store)
    run(store.mark_workflow_sent("user-a", WORKFLOW, idempotency_key="op-1"))
    first = run(store.record_provider_event("user-a", WORKFLOW, event_id="evt-1", idempotency_key="op-1", outcome="success", receipt={"provider": "reported"}))
    duplicate = run(store.record_provider_event("user-a", WORKFLOW, event_id="evt-1", idempotency_key="op-1", outcome="success", receipt={"provider": "duplicate"}))
    assert len(first["provider_events"]) == len(duplicate["provider_events"]) == 1
    assert duplicate["provider_events"][0]["independentVerification"] is False
    unknown = run(store.reconcile_workflow_with_authority("user-a", WORKFLOW, authority=AUTH, idempotency_key="op-1", outcome="unknown", evidence={"source": "late-read"}))
    assert unknown["status"] == "reconciling"


def test_restart_recovery_retry_and_cross_user_isolation():
    collection = FakeCollection()
    a = GuardianStore(collection)
    run(a.claim_workflow_lease("user-a", WORKFLOW, owner="worker-a", fence=1))
    retry = run(a.retry_workflow("user-a", WORKFLOW, owner="worker-a", fence=1, error="provider timeout"))
    assert retry["worker"]["state"] == "retry_waiting"
    recovered = run(a.recover_workflow("user-a", WORKFLOW, owner="worker-a", fence=1))
    assert recovered["worker"]["restartRecovered"] is True
    b = GuardianStore(collection)
    isolated = run(b.get_workflow("user-b", WORKFLOW))
    assert isolated["lease"] is None
    assert isolated["dispatches"] == []


def test_portal_weave_is_typed_private_and_arbitrates_all_seven_domains():
    store = leased_store()
    domains = ["creativity", "work", "home", "wellbeing", "relationships", "community", "style"]
    for index, domain in enumerate(domains):
        run(store.add_portal_contribution("user-a", WORKFLOW, contribution_id=f"c-{index}", portal_id=domain, kind="signal", summary=f"{domain} summary", version="v1", privacy_scope="private", authority_scopes=domains, idempotency_key=f"weave-{domain}"))
    result = run(store.arbitrate_portal_weave("user-a", WORKFLOW))
    weave = result["portal_weave"]
    assert weave["arbitration"]["state"] == "prepared"
    assert weave["arbitration"]["domains"] == domains
    assert len(weave["arbitration"]["selected"]) == 7
    assert weave["arbitration"]["execution"] == "not_requested"
