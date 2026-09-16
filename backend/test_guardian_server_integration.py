import asyncio

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from guardian_server_integration import ensure_guardian_indexes, install_guardian_core
from test_guardian_store import FakeCollection


class IndexCollection(FakeCollection):
    def __init__(self):
        super().__init__()
        self.index_calls = []

    async def create_index(self, key, unique=False):
        self.index_calls.append((key, unique))
        return key


class FakeDB:
    def __init__(self):
        self.guardian_core_state = IndexCollection()


def test_install_mounts_authenticated_guardian_routes_under_api():
    db = FakeDB()

    async def auth(authorization):
        if authorization != "Bearer user-a":
            raise HTTPException(status_code=401, detail="invalid_session")
        return {"user_id": "user-a"}

    app = FastAPI()
    install_guardian_core(app, db=db, get_current_user=auth)
    client = TestClient(app)

    assert client.get("/api/guardian/core/briefing").status_code == 401
    response = client.get(
        "/api/guardian/core/briefing",
        headers={"Authorization": "Bearer user-a"},
    )
    assert response.status_code == 200
    assert response.json()["persistence"]["durable"] is True


def test_index_boundary_is_unique_per_user():
    db = FakeDB()
    asyncio.run(ensure_guardian_indexes(db))
    assert db.guardian_core_state.index_calls == [("user_id", True)]
