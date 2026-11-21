"""Guardian mission API isolation and authorization regression tests."""
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from guardian_mission_routes import build_guardian_mission_router


class Cursor:
    def __init__(self, docs):
        self.docs = docs
    def sort(self, *_):
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
        return Cursor([self.project(x, projection) for x in self.docs
                       if x["owner_id"] == query["owner_id"]])
    async def find_one(self, query, projection):
        self.queries.append((query, projection))
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return self.project(doc, projection)
        return None
    @staticmethod
    def project(doc, projection):
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
