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
        if not authorization or not authorization.startswith("Bearer user-"):
            raise HTTPException(status_code=401, detail="invalid_session")
        return {"user_id": authorization.removeprefix("Bearer ")}

    app = FastAPI()
    app.include_router(build_guardian_router(db=db, get_current_user=get_current_user), prefix="/api")
    return app


def test_routes_require_authentication():
    client = TestClient(make_app())
    assert client.get("/api/guardian/core/briefing").status_code == 401
    assert client.get("/api/guardian/core/missions").status_code == 401


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

    accepted = client.patch(
        path,
        headers=headers,
        json={
            "patch": {"status": "completed"},
            "ledger_state": "VERIFIED_COMPLETE",
            "summary": "Hub Core activation milestone verified.",
            "evidence": {"ci": "passed"},
        },
    )
    assert accepted.status_code == 200
    assert accepted.json()["status"] == "completed"
    assert accepted.json()["lastVerifiedUpdate"]


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
