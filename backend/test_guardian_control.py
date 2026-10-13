import asyncio
from copy import deepcopy

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from guardian_control import ApprovalInput, GrantInput, GuardianControl, PlanInput, SafeModeInput, digest
from guardian_control_store import GuardianControlStore
from guardian_server_integration import install_guardian_core
from test_guardian_store import FakeCollection, WriteResult


class Clock:
    now = 1000.0

    def __call__(self):
        return self.now


def make_engine():
    clock = Clock()
    return GuardianControl("user-a", clock=clock), clock


def grant(engine, **overrides):
    return engine.grant(GrantInput(**{"connector": "files", "capability": "write", "resource": "demo", "autonomy": "A3", **overrides}))


def plan(engine, **overrides):
    return engine.plan(PlanInput(**{"skill_id": "files.write_preview", "resource": "demo", "value": "Scoped example", "request_key": "test_key_0001", **overrides}))


def test_end_to_end_requires_independent_verification_and_proposes_memory():
    engine, _ = make_engine()
    grant(engine)
    run = plan(engine)
    executed = engine.advance(run["run_id"])
    assert executed["status"] == "verifying"
    assert executed["evidence"] is None
    assert not engine.state["memory_proposals"]
    verified = engine.verify(run["run_id"])
    assert verified["status"] == "completed_verified"
    assert verified["evidence"]["passed"]
    assert next(iter(engine.state["memory_proposals"].values()))["status"] == "proposed"
    assert all(e["mode"] == "SIMULATED" for e in engine.events)
    assert engine.status()["production_actions_enabled"] is False


@pytest.mark.parametrize("overrides", [{"resource": "other"}, {"connector": "calendar", "capability": "create_draft"}, {"autonomy": "A0"}, {"autonomy": "A1"}, {"max_risk": "green"}, {"sensitivity": "public"}])
def test_scope_autonomy_risk_and_sensitivity_fail_closed(overrides):
    engine, _ = make_engine()
    grant(engine, **overrides)
    run = plan(engine)
    assert engine.advance(run["run_id"])["status"] == "blocked_permission"
    assert not engine.state["resources"]


def test_no_grant_and_revoked_grant_cannot_execute():
    engine, _ = make_engine()
    run = plan(engine)
    assert engine.advance(run["run_id"])["status"] == "blocked_permission"
    g = grant(engine)
    run = plan(engine, request_key="test_key_0002")
    engine.revoke(g["grant_id"])
    assert engine.advance(run["run_id"])["status"] == "blocked_permission"


def test_expired_grant_cannot_execute():
    engine, clock = make_engine()
    grant(engine, expires_in_seconds=60)
    clock.now += 60
    run = plan(engine)
    assert engine.advance(run["run_id"])["status"] == "blocked_permission"


def test_a2_exact_approval_expiry_and_consumption():
    engine, clock = make_engine()
    grant(engine, autonomy="A2")
    run = plan(engine)
    assert engine.advance(run["run_id"])["status"] == "approval_needed"
    with pytest.raises(ValueError, match="approval_plan_mismatch"):
        engine.approve(run["run_id"], ApprovalInput(plan_hash="a" * 64))
    approved = engine.approve(run["run_id"], ApprovalInput(plan_hash=run["plan_hash"]))
    assert not approved["approval"]["consumed"]
    executed = engine.advance(run["run_id"])
    assert executed["approval"]["consumed"]
    with pytest.raises(ValueError, match="not_awaiting_approval"):
        engine.approve(run["run_id"], ApprovalInput(plan_hash=run["plan_hash"]))
    assert clock.now < run["deadline"]


def test_approval_invalidated_by_policy_change():
    engine, _ = make_engine()
    g = grant(engine, autonomy="A2")
    grant(engine, autonomy="A2")
    run = plan(engine)
    engine.advance(run["run_id"])
    engine.approve(run["run_id"], ApprovalInput(plan_hash=run["plan_hash"]))
    engine.revoke(g["grant_id"])
    assert engine.advance(run["run_id"])["status"] == "approval_needed"


def test_changed_plan_cannot_reuse_approval_or_lower_risk():
    engine, _ = make_engine()
    grant(engine)
    run = plan(engine)
    engine.get_run(run["run_id"])["action"]["value"] = "Different action"
    result = engine.advance(run["run_id"])
    assert result["status"] == "blocked_permission"
    assert result["reason"] == "plan_changed_replan_required"


@pytest.mark.parametrize("attack", ["send_email", "publish", "delete_account", "reveal_credentials", "raise_autonomy", "disable_audit", "disable_safe_mode"])
def test_unknown_and_dangerous_skills_cannot_be_registered(attack):
    engine, _ = make_engine()
    with pytest.raises(ValueError, match="unknown_or_prohibited_skill"):
        plan(engine, skill_id=attack)
    assert not engine.state["resources"]


def test_closed_input_schemas_reject_self_authorization_and_credentials():
    with pytest.raises(ValidationError):
        PlanInput(skill_id="files.write_preview", resource="demo", request_key="test_key_0001", autonomy="A4", risk="green")
    with pytest.raises(ValidationError):
        PlanInput(skill_id="files.write_preview", resource="demo", request_key="test_key_0001", value="api_key=sk-fake-secret")
    with pytest.raises(ValidationError):
        GrantInput(connector="files", capability="write", resource="../escape")


@pytest.mark.parametrize("mutation", ["lane", "expiry", "revocation", "action", "safe_mode"])
def test_scoped_execution_tokens_fail_on_replay_or_changed_boundary(mutation):
    engine, clock = make_engine()
    g = grant(engine)
    run = engine.get_run(plan(engine)["run_id"])
    _, _, token = engine.authorize(run)
    if mutation == "lane":
        run["lane_id"] = "different"
    elif mutation == "expiry":
        clock.now += 5
    elif mutation == "revocation":
        engine.revoke(g["grant_id"])
    elif mutation == "action":
        run["action"]["connector"] = "calendar"
    else:
        engine.safe_mode(SafeModeInput(enabled=True))
    with pytest.raises(ValueError, match="invalid_execution_token"):
        engine._execute(token, run)
    assert not engine.state["resources"]


def test_token_consumed_once():
    engine, _ = make_engine()
    grant(engine)
    run = engine.get_run(plan(engine)["run_id"])
    _, _, token = engine.authorize(run)
    engine._execute(token, run)
    with pytest.raises(ValueError):
        engine._execute(token, run)


def test_duplicate_requests_do_not_duplicate_effects_and_changed_keys_are_rejected():
    engine, _ = make_engine()
    grant(engine)
    run = plan(engine)
    assert plan(engine)["run_id"] == run["run_id"]
    engine.advance(run["run_id"])
    assert engine.advance(run["run_id"])["status"] == "verifying"
    assert engine.state["resources"]["files:demo"]["version"] == 1
    engine.verify(run["run_id"])
    assert engine.advance(run["run_id"])["status"] == "completed_verified"
    with pytest.raises(ValueError, match="idempotency_key_conflict"):
        plan(engine, value="Changed request")


def test_conflicting_lanes_cannot_overwrite_resource():
    engine, _ = make_engine()
    grant(engine)
    a = plan(engine)
    b = plan(engine, request_key="test_key_0002", value="Conflicting write")
    assert a["lane_id"] != b["lane_id"]
    engine.advance(a["run_id"])
    result = engine.advance(b["run_id"])
    assert result["reason"] == "resource_changed_replan_required"
    assert engine.state["resources"]["files:demo"]["value"] == "Scoped example"


def test_safe_mode_stops_verification_and_resume_does_not_restore_grants():
    engine, _ = make_engine()
    grant(engine)
    run = plan(engine)
    engine.advance(run["run_id"])
    engine.safe_mode(SafeModeInput(enabled=True))
    assert engine.verify(run["run_id"])["status"] == "stopped_safe_mode"
    assert not engine.state["memory_proposals"]
    with pytest.raises(ValueError, match="explicit_resume_required"):
        engine.safe_mode(SafeModeInput(enabled=False))
    engine.safe_mode(SafeModeInput(enabled=False, confirm_resume=True))
    newer = plan(engine, request_key="test_key_0002")
    assert engine.advance(newer["run_id"])["status"] == "blocked_permission"


def test_timeout_and_retry_exhaustion_are_terminal():
    engine, clock = make_engine()
    grant(engine)
    run = plan(engine)
    clock.now += 60
    assert engine.advance(run["run_id"])["status"] == "timed_out"
    engine, _ = make_engine()
    grant(engine)
    run = plan(engine)
    engine._verify = lambda r: {"passed": False, "criterion": "injected_failure"}
    engine.advance(run["run_id"])
    assert engine.verify(run["run_id"])["status"] == "repair_needed"
    engine.advance(run["run_id"])
    assert engine.verify(run["run_id"])["status"] == "retry_exhausted"
    assert engine.advance(run["run_id"])["attempts"] == 2
    assert engine.state["resources"]["files:demo"]["version"] == 1


def test_schedule_requires_a4_and_orange_always_needs_confirmation():
    engine, _ = make_engine()
    grant(engine)
    run = plan(engine, trigger="schedule")
    assert engine.advance(run["run_id"])["status"] == "blocked_permission"
    grant(engine, autonomy="A4")
    scheduled = plan(engine, trigger="schedule", request_key="test_key_0002")
    assert engine.advance(scheduled["run_id"])["status"] == "verifying"
    grant(engine, connector="calendar", capability="modify_event", autonomy="A4", max_risk="orange")
    orange = plan(engine, skill_id="calendar.modify_preview", request_key="test_key_0003")
    assert engine.advance(orange["run_id"])["status"] == "approval_needed"


def test_verifier_detects_corruption_and_context_excludes_other_memory():
    engine, _ = make_engine()
    grant(engine)
    run = plan(engine)
    with pytest.raises(ValueError, match="not_awaiting_verification"):
        engine.verify(run["run_id"])
    engine.advance(run["run_id"])
    engine.state["resources"]["files:demo"]["value"] = "Unexpected state"
    assert engine.verify(run["run_id"])["status"] == "repair_needed"
    packet = engine.context(run["run_id"])
    assert "grants" not in packet and "memory_proposals" not in packet and "value" not in packet
    assert packet["project"] == "STAARWAARDD"


def test_audit_chain_and_memory_retention_require_owner_decision():
    engine, _ = make_engine()
    grant(engine)
    run = plan(engine)
    engine.advance(run["run_id"])
    engine.verify(run["run_id"])
    proposal = next(iter(engine.state["memory_proposals"].values()))
    assert engine.resolve_memory(proposal["proposal_id"], True)["status"] == "retained_project_only"
    previous = "0" * 64
    for event in engine.events:
        assert event["previous_hash"] == previous
        assert event["hash"] == digest({k: v for k, v in event.items() if k != "hash"})
        previous = event["hash"]
    assert engine.state["audit_head"] == previous


class ControlCollection(FakeCollection):
    def __init__(self):
        super().__init__()
        self.writes = []

    async def update_one(self, query, update, upsert=False):
        self.writes.append(deepcopy(update))
        result = await super().update_one(query, update, upsert)
        if result.matched_count:
            for key, operation in update.get("$push", {}).items():
                self.documents[query["user_id"]].setdefault(key, []).extend(deepcopy(operation["$each"]))
        return result


def app_and_db():
    class DB:
        guardian_core_state = FakeCollection()
        guardian_control_state = ControlCollection()

    async def auth(authorization):
        if authorization not in ("Bearer user-a", "Bearer user-b"):
            raise HTTPException(status_code=401, detail="invalid_session")
        return {"user_id": authorization[7:]}

    app = FastAPI()
    db = DB()
    install_guardian_core(app, db=db, get_current_user=auth)
    return TestClient(app), db


def test_http_authentication_and_cross_user_isolation():
    client, _ = app_and_db()
    root = "/api/guardian/control"
    assert client.get(root + "/status").status_code == 401
    a, b = {"Authorization": "Bearer user-a"}, {"Authorization": "Bearer user-b"}
    body = {"skill_id": "files.write_preview", "resource": "demo", "value": "Scoped", "request_key": "test_key_0001"}
    run = client.post(root + "/runs", headers=a, json=body).json()
    assert client.post(root + f"/runs/{run['run_id']}/advance", headers=b, json={}).status_code == 404
    assert client.get(root + "/status", headers=b).json()["runs"] == []
    attack = client.post(root + "/runs", headers=a, json={**body, "autonomy": "A4"})
    assert attack.status_code == 422


def test_http_durable_end_to_end_and_append_only_audit():
    client, db = app_and_db()
    root = "/api/guardian/control"
    headers = {"Authorization": "Bearer user-a"}
    assert client.post(root + "/grants", headers=headers, json={"connector": "files", "capability": "write", "resource": "demo", "autonomy": "A2"}).status_code == 200
    run = client.post(root + "/runs", headers=headers, json={"skill_id": "files.write_preview", "resource": "demo", "value": "Scoped", "request_key": "test_key_0001"}).json()
    path = root + "/runs/" + run["run_id"]
    assert client.post(path + "/advance", headers=headers, json={}).json()["status"] == "approval_needed"
    assert client.post(path + "/approve", headers=headers, json={"plan_hash": run["plan_hash"]}).status_code == 200
    assert client.post(path + "/advance", headers=headers, json={}).json()["status"] == "verifying"
    assert client.post(path + "/verify", headers=headers, json={}).json()["status"] == "completed_verified"
    restored = asyncio.run(GuardianControlStore(db.guardian_control_state).status("user-a"))
    assert restored["runs"][0]["status"] == "completed_verified"
    assert all("audit" not in w.get("$set", {}) for w in db.guardian_control_state.writes)
    assert restored["audit"][-1]["kind"] == "loop_state"


def test_rejected_credentials_are_not_echoed_or_persisted():
    client, db = app_and_db()
    marker = "api_key=sk-example-rejected-secret"
    response = client.post("/api/guardian/control/runs", headers={"Authorization": "Bearer user-a"}, json={"skill_id": "files.write_preview", "resource": "demo", "request_key": "test_key_0001", "value": marker})
    assert response.status_code == 422
    assert marker not in response.text
    assert not db.guardian_control_state.documents


def test_cas_conflict_rechecks_safe_mode_instead_of_committing_stale_effect():
    class RaceCollection(ControlCollection):
        race = False

        async def update_one(self, query, update, upsert=False):
            if self.race and "version" in query:
                self.race = False
                self.documents[query["user_id"]]["state"]["safe_mode"] = True
                self.documents[query["user_id"]]["version"] += 1
                return WriteResult(0)
            return await super().update_one(query, update, upsert)

    async def scenario():
        collection = RaceCollection()
        store = GuardianControlStore(collection)
        await store.mutate("user-a", "grant", GrantInput(connector="files", capability="write", resource="demo", autonomy="A3"))
        run = await store.mutate("user-a", "plan", PlanInput(skill_id="files.write_preview", resource="demo", value="Scoped", request_key="test_key_0001"))
        collection.race = True
        result = await store.mutate("user-a", "advance", run["run_id"])
        assert result["status"] == "stopped_safe_mode"
        assert not collection.documents["user-a"]["state"]["resources"]

    asyncio.run(scenario())


def test_cancel_one_lane_does_not_stop_another():
    engine, _ = make_engine()
    grant(engine)
    a = plan(engine)
    b = plan(engine, request_key="test_key_0002", resource="other")
    assert engine.cancel(a["run_id"])["status"] == "cancelled"
    assert engine.get_run(b["run_id"])["status"] == "planned"


@pytest.mark.parametrize("connector,capability,skill", [("calendar", "create_draft", "calendar.propose_event"), ("creative", "health_check", "creative.connector_health_check")])
def test_other_connectors_work_only_inside_simulation(connector, capability, skill):
    engine, _ = make_engine()
    grant(engine, connector=connector, capability=capability)
    run = plan(engine, skill_id=skill)
    assert engine.advance(run["run_id"])["status"] == "verifying"
    assert engine.verify(run["run_id"])["evidence"]["mode"] == "SIMULATED"


def test_memory_expires_and_discard_removes_proposal():
    engine, clock = make_engine()
    grant(engine)
    run = plan(engine)
    engine.advance(run["run_id"])
    engine.verify(run["run_id"])
    proposal_id = next(iter(engine.state["memory_proposals"]))
    engine.resolve_memory(proposal_id, False)
    assert not engine.state["memory_proposals"]
    run = plan(engine, resource="other", request_key="test_key_0002")
    grant(engine, resource="other")
    engine.advance(run["run_id"])
    engine.verify(run["run_id"])
    clock.now += 86400
    assert engine.purge_expired_memory()["expired_count"] == 1
    assert not engine.state["memory_proposals"]


def test_safe_mode_blocks_legacy_guardian_routes_before_handler():
    client, _ = app_and_db()
    called = []

    @client.app.post("/api/guardian/coordinate-evening")
    async def legacy_action():
        called.append(True)
        return {"executed": True}

    headers = {"Authorization": "Bearer user-a"}
    assert client.post("/api/guardian/control/safe-mode", headers=headers, json={"enabled": True}).status_code == 200
    response = client.post("/api/guardian/coordinate-evening", headers=headers, json={"approve": True})
    assert response.status_code == 409
    assert not called


def test_emergency_stop_does_not_depend_on_regular_request_quota():
    class DB:
        guardian_core_state = FakeCollection()
        guardian_control_state = ControlCollection()

    async def auth(authorization):
        return {"user_id": "user-a"}

    def exhausted(*args):
        raise HTTPException(status_code=429, detail="rate_limited")

    app = FastAPI()
    install_guardian_core(app, db=DB(), get_current_user=auth, rate_limit=exhausted)
    client = TestClient(app)
    assert client.get("/api/guardian/control/status").status_code == 429
    assert client.post("/api/guardian/control/safe-mode", json={"enabled": True}).status_code == 200


def test_retry_budget_cannot_be_raised_and_no_audit_mutation_endpoint_exists():
    client, _ = app_and_db()
    headers = {"Authorization": "Bearer user-a"}
    body = {"skill_id": "files.write_preview", "resource": "demo", "value": "Scoped", "request_key": "test_key_0001", "retry_limit": 999999}
    assert client.post("/api/guardian/control/runs", headers=headers, json=body).status_code == 422
    assert client.delete("/api/guardian/control/audit", headers=headers).status_code == 404
    assert client.patch("/api/guardian/control/audit", headers=headers, json={"events": []}).status_code == 404
