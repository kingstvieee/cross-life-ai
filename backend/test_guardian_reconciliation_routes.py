from fastapi.testclient import TestClient

from test_guardian_routes import make_app


PATH = "/api/guardian/core/workflows/rsf-fabric-sourcing"
A = {"Authorization": "Bearer user-a"}
B = {"Authorization": "Bearer user-b"}
AUTH = {"version": 1, "scopes": ["execute", "read"], "revoked": False, "portals": ["work"]}


def test_new_workflow_routes_require_auth_and_keep_users_isolated():
    client = TestClient(make_app())
    assert client.post(PATH + "/speech", json={"quiet": True}).status_code == 401
    assert client.post(PATH + "/dispatch", headers=A, json={
        "owner": "worker-a", "fence": 1, "action": "prepare", "action_version": "v2",
        "authority": AUTH, "context": {"portals": {"work": {"title": "safe"}}}, "idempotency_key": "http-op",
    }).status_code == 409
    assert client.post(PATH + "/lease", headers=A, json={"owner": "worker-a", "fence": 1}).status_code == 200
    dispatched = client.post(PATH + "/dispatch", headers=A, json={
        "owner": "worker-a", "fence": 1, "action": "prepare", "action_version": "v2",
        "authority": AUTH, "context": {"portals": {"work": {"title": "safe"}, "home": {"secret": "drop"}}}, "idempotency_key": "http-op",
    })
    assert dispatched.status_code == 200
    assert client.get(PATH, headers=B).json()["dispatches"] == []
    assert dispatched.json()["dispatches"][0]["context"]["context"] == {"work": {"title": "safe"}}


def test_http_reconciliation_requires_read_authority_for_external_dispatch():
    client = TestClient(make_app())
    client.post(PATH + "/lease", headers=A, json={"owner": "worker-a", "fence": 1})
    client.post(PATH + "/dispatch", headers=A, json={
        "owner": "worker-a", "fence": 1, "action": "prepare", "action_version": "v2",
        "authority": AUTH, "context": {}, "idempotency_key": "http-op",
    })
    client.post(PATH + "/sent", headers=A, json={"idempotency_key": "http-op"})
    denied = client.post(PATH + "/reconcile", headers=A, json={"idempotency_key": "http-op", "outcome": "unknown", "evidence": {}, "authority": {"version": 1, "scopes": ["execute"], "revoked": False}})
    assert denied.status_code == 409
    accepted = client.post(PATH + "/reconcile", headers=A, json={"idempotency_key": "http-op", "outcome": "unknown", "evidence": {"source": "read"}, "authority": AUTH})
    assert accepted.status_code == 200
    assert accepted.json()["status"] == "reconciling"
