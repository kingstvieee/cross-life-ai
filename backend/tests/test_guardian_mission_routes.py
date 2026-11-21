"""Guardian mission API isolation and authorization regression tests."""
from datetime import datetime, timezone

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pymongo.errors import DuplicateKeyError

from guardian_mission_routes import build_guardian_mission_router


class Cursor:
    def __init__(self, docs):
        self.docs = docs
    def sort(self, fields):
        for key, direction in reversed(fields):
            self.docs.sort(key=lambda doc: doc.get(key), reverse=direction < 0)
        return self
    def limit(self, n):
        self.docs = self.docs[:n]
        return self
    def __aiter__(self):
        self.iterator = iter(self.docs)
        return self
    async def __anext__(self):
        try:
            return next(self.iterator)
        except StopIteration:
            raise StopAsyncIteration


class Missions:
    def __init__(self):
        self.queries = []
        self.docs = [
            {"owner_id": "alice", "mission_id": "a1", "status": "queued", "lease_token": "secret"},
            {"owner_id": "bob", "mission_id": "b1", "status": "running", "lease_token": "secret"},
        ]
    def find(self, query, projection):
        self.queries.append((query, projection))
        clauses = query.get("$or")
        def matches(doc, conditions):
            return all(
                key == "$or" or
                (doc[key] < value["$lt"] if isinstance(value, dict) else doc.get(key) == value)
                for key, value in conditions.items()
            )
        return Cursor([self.project(x, projection) for x in self.docs
                       if matches(x, query) and
                       (not clauses or any(matches(x, clause) for clause in clauses))])
    async def insert_one(self, doc):
        if any(saved["owner_id"] == doc["owner_id"] and
               saved.get("idempotency_key") == doc["idempotency_key"]
               for saved in self.docs):
            raise DuplicateKeyError("duplicate mission")
        self.docs.append(dict(doc))
    async def find_one(self, query, projection):
        self.queries.append((query, projection))
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return self.project(doc, projection)
        return None
    async def find_one_and_update(self, query, update, *, return_document):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                doc.update(update["$set"])
                return dict(doc)
        return None
    @staticmethod
    def project(doc, projection):
        if not any(projection.values()):
            return {k: v for k, v in doc.items() if k not in projection}
        return {k: v for k, v in doc.items() if projection.get(k) == 1}


@pytest.fixture
def api():
    missions = Missions()
    class Database:
        guardian_missions = missions
    async def account(authorization=None):
        from fastapi import Header
        # Tests explicitly inject a dependency override below.
        raise HTTPException(status_code=401, detail="unauthenticated")
    app = FastAPI()
    app.include_router(build_guardian_mission_router(
        db=Database(), require_account_user=account), prefix="/api")
    return app, missions, account


def test_requires_authenticated_account(api):
    app, _, _ = api
    with TestClient(app) as client:
        assert client.get("/api/guardian/missions").status_code == 401


def test_owner_scoped_list_excludes_other_tenants_and_secrets(api):
    app, missions, account = api
    app.dependency_overrides[account] = lambda: {"user_id": "alice"}
    with TestClient(app) as client:
        response = client.get("/api/guardian/missions")
    assert response.status_code == 200
    assert [x["mission_id"] for x in response.json()["missions"]] == ["a1"]
    assert "lease_token" not in str(response.json())
    assert missions.queries[0][0] == {"owner_id": "alice"}


def test_cross_tenant_lookup_is_not_found(api):
    app, missions, account = api
    app.dependency_overrides[account] = lambda: {"user_id": "alice"}
    with TestClient(app) as client:
        response = client.get("/api/guardian/missions/b1")
    assert response.status_code == 404
    assert missions.queries[0][0] == {"owner_id": "alice", "mission_id": "b1"}


def test_missing_identity_is_rejected(api):
    app, _, account = api
    app.dependency_overrides[account] = lambda: {}
    with TestClient(app) as client:
        response = client.get("/api/guardian/missions")
    assert response.status_code == 403


def test_limit_is_bounded(api):
    app, _, account = api
    app.dependency_overrides[account] = lambda: {"user_id": "alice"}
    with TestClient(app) as client:
        response = client.get("/api/guardian/missions?limit=1001")
    assert response.status_code == 422


def test_proposal_retry_preserves_objective_and_does_not_queue(api):
    app, missions, account = api
    app.dependency_overrides[account] = lambda: {"user_id": "alice"}
    payload = {
        "objective": "Prepare a supplier comparison",
        "success_criteria": "Show two quotes with source dates",
        "idempotency_key": "supplier-comparison-1",
        "expires_at": "2099-11-21T15:00:00.123456-05:00",
    }
    with TestClient(app) as client:
        first = client.post("/api/guardian/missions", json=payload)
        retry = client.post("/api/guardian/missions", json={
            **payload, "expires_at": "2099-11-21T20:00:00.123Z",
        })
        conflict = client.post("/api/guardian/missions", json={
            **payload, "success_criteria": "Show three verified quotes",
        })
        deadline_conflict = client.post("/api/guardian/missions", json={
            **payload, "expires_at": "2099-11-22T20:00:00Z",
        })
        naive = client.post("/api/guardian/missions", json={
            **payload, "expires_at": "2099-11-21T20:00:00",
        })
        detail = client.get(f"/api/guardian/missions/{first.json()['mission_id']}")
    assert first.status_code == retry.status_code == 201
    assert retry.json() == first.json()
    assert retry.json()["status"] == "proposed"
    assert conflict.status_code == 409
    assert deadline_conflict.status_code == 409
    assert naive.status_code == 422
    assert detail.json()["expires_at"] == "2099-11-21T20:00:00.123000+00:00"
    assert len(missions.docs) == 3


def test_only_owner_can_withdraw_a_proposal_and_retry(api):
    app, missions, account = api
    missions.docs.append({"owner_id": "alice", "mission_id": "draft", "status": "proposed"})
    with TestClient(app) as client:
        url = "/api/guardian/missions/draft/withdraw"
        app.dependency_overrides[account] = lambda: {"user_id": "bob"}
        assert client.post(url).status_code == 404
        app.dependency_overrides[account] = lambda: {"user_id": "alice"}
        assert client.post("/api/guardian/missions/a1/withdraw").status_code == 409
        for _ in range(2):
            response = client.post(url)
            assert response.status_code == 200
            assert response.json()["status"] == "cancelled"


def test_status_filter_retains_tenant_isolation(api):
    app, missions, account = api
    missions.docs.append({"owner_id": "bob", "mission_id": "b2", "status": "queued"})
    app.dependency_overrides[account] = lambda: {"user_id": "alice"}
    with TestClient(app) as client:
        result = client.get("/api/guardian/missions?status=queued")
        assert client.get("/api/guardian/missions?status=invalid").status_code == 422
    assert [item["mission_id"] for item in result.json()["missions"]] == ["a1"]


def test_mission_cursor_pages_equal_timestamps_and_rejects_foreign_anchor(api):
    app, missions, account = api
    stamp = datetime(2026, 11, 21, tzinfo=timezone.utc)
    for mission in missions.docs:
        mission["created_at"] = stamp
    missions.docs.append({"owner_id": "alice", "mission_id": "a2",
                          "status": "queued", "created_at": stamp})
    app.dependency_overrides[account] = lambda: {"user_id": "alice"}
    with TestClient(app) as client:
        url = "/api/guardian/missions?status=queued&limit=1"
        first = client.get(url).json()
        assert first["next_cursor"] == "a2"
        second = client.get(url + "&after=a2").json()
        assert [item["mission_id"] for item in second["missions"]] == ["a1"]
        assert second["next_cursor"] is None
        assert client.get(url + "&after=b1").status_code == 404


@pytest.mark.parametrize("status,expected", [("queued", 200), ("leased", 409),
                                               ("running", 409), ("retry_wait", 200)])
def test_cancel_pending_is_owner_scoped_and_state_gated(api, status, expected):
    app, missions, account = api
    missions.docs[0]["status"] = status
    url = "/api/guardian/missions/a1/cancel-pending"
    with TestClient(app) as client:
        app.dependency_overrides[account] = lambda: {"user_id": "bob"}
        assert client.post(url).status_code == 404
        app.dependency_overrides[account] = lambda: {"user_id": "alice"}
        assert client.post(url).status_code == expected
        if expected == 200:
            assert client.post(url).json()["status"] == "cancelled"
