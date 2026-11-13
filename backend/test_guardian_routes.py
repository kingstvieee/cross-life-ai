import asyncio

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from guardian_routes import build_guardian_router
from test_guardian_store import FakeCollection


class FakeDB:
    def __init__(self):
        self.guardian_core_state = FakeCollection()


def make_app():
    db = FakeDB()

    async def get_current_user(authorization):
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="invalid_session")
        user_id = authorization.removeprefix("Bearer ")
        return {"user_id": user_id, "is_demo": user_id.startswith("demo_")}

    async def get_trusted_worker(token):
        if token != "worker-test":
            raise HTTPException(status_code=403, detail="trusted_worker_required")
        return {"workerId": "worker-test"}

    app = FastAPI()
    app.state.guardian_db = db.guardian_core_state
    app.include_router(build_guardian_router(db=db, get_current_user=get_current_user, get_trusted_worker=get_trusted_worker), prefix="/api")
    return app


def test_routes_require_authentication():
    client = TestClient(make_app())
    assert client.get("/api/guardian/core/briefing").status_code == 401
    assert client.get("/api/guardian/core/missions").status_code == 401


def test_legacy_demo_sessions_are_read_only_for_guardian_mutations():
    client = TestClient(make_app())
    headers = {"Authorization": "Bearer demo_fixture", "X-Guardian-Worker-Token": "worker-test"}
    assert client.get("/api/guardian/core/workflows/rsf-fabric-sourcing", headers=headers).status_code == 200
    response = client.post("/api/guardian/core/workflows/rsf-fabric-sourcing/lease", headers=headers, json={"owner": "worker-a", "fence": 1})
    assert response.status_code == 403
    assert response.json()["detail"] == "demo_guest_read_only"


def test_briefing_is_durable_and_scoped_to_authenticated_user():
    client = TestClient(make_app())
    a = {"Authorization": "Bearer user-a"}
    b = {"Authorization": "Bearer user-b"}

    first = client.get("/api/guardian/core/briefing", headers=a)
    assert first.status_code == 200
    assert first.json()["persistence"]["durable"] is True
    assert first.json()["persistence"]["scope"] == "per-user"

    changed = client.post(
        "/api/guardian/core/private-mode",
        headers=a,
        json={"enabled": True},
    )
    assert changed.status_code == 200
    assert changed.json() == {"privateMode": True}

    assert client.get("/api/guardian/core/briefing", headers=a).json()["privateMode"] is True
    assert client.get("/api/guardian/core/briefing", headers=b).json()["privateMode"] is False


def test_mission_update_cannot_change_identity_or_user_scope():
    client = TestClient(make_app())
    headers = {"Authorization": "Bearer user-a"}

    identity = client.patch(
        "/api/guardian/core/missions/hub-core-build",
        headers=headers,
        json={"patch": {"id": "other"}},
    )
    assert identity.status_code == 400
    assert identity.json()["detail"] == "mission_id_is_immutable"

    scope = client.patch(
        "/api/guardian/core/missions/hub-core-build",
        headers=headers,
        json={"patch": {"user_id": "user-b"}},
    )
    assert scope.status_code == 400
    assert scope.json()["detail"] == "user_scope_is_immutable"


def test_completion_evidence_gate_survives_http_boundary():
    client = TestClient(make_app())
    headers = {"Authorization": "Bearer user-a"}
    path = "/api/guardian/core/missions/hub-core-build"

    rejected = client.patch(
        path,
        headers=headers,
        json={"patch": {"status": "completed"}},
    )
    assert rejected.status_code == 400

    client_claim = client.patch(
        path,
        headers=headers,
        json={
            "patch": {"status": "completed"},
            "ledger_state": "VERIFIED_COMPLETE",
            "summary": "Hub Core activation milestone verified.",
            "evidence": {"ci": "passed"},
        },
    )
    assert client_claim.status_code == 400
    assert client_claim.json()["detail"] == "completion_is_server_owned"


def test_renderer_ignores_forged_completion_text_and_uses_canonical_state():
    client = TestClient(make_app())
    rendered = client.post(
        "/api/guardian/core/workflows/rsf-fabric-sourcing/render",
        headers={"Authorization": "Bearer user-a"},
        json={"requested_text": "Done — the work completed successfully."},
    )
    assert rendered.status_code == 200
    assert rendered.json()["state"] == "ready"
    assert "Done" not in rendered.json()["text"]
    assert rendered.json()["modelTextIgnored"] is True


def test_unknown_mission_and_invalid_portal_are_safe_client_errors():
    client = TestClient(make_app())
    headers = {"Authorization": "Bearer user-a"}

    missing = client.get("/api/guardian/core/missions/nope", headers=headers)
    assert missing.status_code == 404

    invalid = client.get(
        "/api/guardian/core/missions?portal=NotAPortal",
        headers=headers,
    )
    assert invalid.status_code == 400


def test_rsf_workflow_routes_are_authenticated_scoped_and_fenced():
    client = TestClient(make_app())
    a = {"Authorization": "Bearer user-a"}
    b = {"Authorization": "Bearer user-b"}
    path = "/api/guardian/core/workflows/rsf-fabric-sourcing"

    assert client.get(path).status_code == 401
    assert client.get(path, headers=a).json()["source_manifest"]["status"] == "fixture-only"
    leased = client.post(path + "/lease", headers={**a, "X-Guardian-Worker-Token": "worker-test"}, json={"owner": "worker-a", "fence": 4})
    assert leased.status_code == 200
    assert client.get(path, headers=b).json()["lease"] is None

    stale = client.post(path + "/checkpoints", headers={**a, "X-Guardian-Worker-Token": "worker-test"}, json={"owner": "worker-a", "fence": 3, "checkpoint_id": "stale", "summary": "No", "idempotency_key": "stale"})
    assert stale.status_code == 409
    checkpoint = client.post(path + "/checkpoints", headers={**a, "X-Guardian-Worker-Token": "worker-test"}, json={"owner": "worker-a", "fence": 4, "checkpoint_id": "review", "summary": "Fixture-only review", "idempotency_key": "review:v1"})
    assert checkpoint.status_code == 200
    replay = client.post(path + "/checkpoints", headers={**a, "X-Guardian-Worker-Token": "worker-test"}, json={"owner": "worker-a", "fence": 4, "checkpoint_id": "review", "summary": "Duplicate", "idempotency_key": "review:v1"})
    assert replay.status_code == 200
    assert len(replay.json()["checkpoints"]) == 1
