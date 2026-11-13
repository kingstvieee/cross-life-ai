from copy import deepcopy

from fastapi.testclient import TestClient

from test_guardian_reconciliation import AUTH, DISPATCH_CONTEXT, EXECUTE_GRANT, READ_AUTH
from test_guardian_routes import make_app


PATH = "/api/guardian/core/workflows/rsf-fabric-sourcing"
A = {"Authorization": "Bearer user-a"}
AW = {**A, "X-Guardian-Worker-Token": "worker-test"}
B = {"Authorization": "Bearer user-b", "X-Guardian-Worker-Token": "worker-test"}


def seed_http_authority(client):
    client.get(PATH, headers=A)
    document = client.app.state.guardian_db.documents["user-a"]
    document["workflows"]["rsf-fabric-sourcing"]["authority"].update({
        "scopes": ["execute", "read"],
        "portals": ["work", "style", "creativity", "home", "wellbeing", "relationships", "community"],
        "grants": [deepcopy(EXECUTE_GRANT), {"grantId": "read-rsf-v1", "version": 1, "state": "active", "scopes": ["read"], "portals": ["work", "style"]}],
        "portalGrants": [],
    })


def dispatch_payload(authority=AUTH, action_hash=EXECUTE_GRANT["actionHash"], key="http-op"):
    return {
        "owner": "worker-a", "fence": 1, "action": "prepare supplier review", "action_version": "v2", "action_hash": action_hash,
        "authority": authority, "context": DISPATCH_CONTEXT, "idempotency_key": key,
    }


def test_worker_identity_and_forged_authority_are_rejected():
    client = TestClient(make_app())
    assert client.post(PATH + "/lease", headers=A, json={"owner": "worker-a", "fence": 1}).status_code == 403
    assert client.post(PATH + "/lease", headers=AW, json={"owner": "worker-a", "fence": 1}).status_code == 200
    forged = {**AUTH, "scopes": ["execute", "read", "admin"], "portals": ["home"], "actionHash": "forged"}
    assert client.post(PATH + "/dispatch", headers=AW, json=dispatch_payload(forged, "forged")).status_code == 409


def test_dispatch_requires_server_issued_exact_action_hash_and_version():
    client = TestClient(make_app())
    seed_http_authority(client)
    assert client.post(PATH + "/lease", headers=AW, json={"owner": "worker-a", "fence": 1}).status_code == 200
    wrong_hash = client.post(PATH + "/dispatch", headers=AW, json=dispatch_payload(action_hash="wrong"))
    assert wrong_hash.status_code == 409
    wrong_version = client.post(PATH + "/dispatch", headers=AW, json={**dispatch_payload(), "action_version": "v3"})
    assert wrong_version.status_code == 409


def test_reconciliation_requires_trusted_worker_and_explicit_read_grant():
    client = TestClient(make_app())
    seed_http_authority(client)
    client.post(PATH + "/lease", headers=AW, json={"owner": "worker-a", "fence": 1})
    assert client.post(PATH + "/dispatch", headers=AW, json=dispatch_payload()).status_code == 200
    assert client.post(PATH + "/sent", headers=AW, json={"idempotency_key": "http-op"}).status_code == 200
    assert client.post(PATH + "/reconcile", headers=A, json={"idempotency_key": "http-op", "outcome": "unknown", "evidence": {}, "authority": READ_AUTH}).status_code == 403
    omitted = client.post(PATH + "/reconcile", headers=AW, json={"idempotency_key": "http-op", "outcome": "unknown", "evidence": {}})
    assert omitted.status_code == 409
    forged_read = {**READ_AUTH, "scopes": ["execute", "read"], "portals": ["home"]}
    assert client.post(PATH + "/reconcile", headers=AW, json={"idempotency_key": "http-op", "outcome": "unknown", "evidence": {}, "authority": forged_read}).status_code == 409
    accepted = client.post(PATH + "/reconcile", headers=AW, json={"idempotency_key": "http-op", "outcome": "unknown", "evidence": {"source": "read"}, "authority": READ_AUTH})
    assert accepted.status_code == 200
    assert accepted.json()["status"] == "reconciling"


def test_sent_provider_event_and_receipt_cannot_be_written_by_end_user_or_wrong_dispatch():
    client = TestClient(make_app())
    seed_http_authority(client)
    client.post(PATH + "/lease", headers=AW, json={"owner": "worker-a", "fence": 1})
    client.post(PATH + "/dispatch", headers=AW, json=dispatch_payload())
    assert client.post(PATH + "/sent", headers=A, json={"idempotency_key": "http-op"}).status_code == 403
    assert client.post(PATH + "/provider-event", headers=A, json={"event_id": "e1", "idempotency_key": "http-op", "outcome": "success", "receipt": {"claim": "done"}}).status_code == 403
    assert client.post(PATH + "/provider-event", headers=AW, json={"event_id": "e1", "idempotency_key": "wrong", "outcome": "success", "receipt": {}}).status_code == 409
    event = client.post(PATH + "/provider-event", headers=AW, json={"event_id": "e1", "idempotency_key": "http-op", "outcome": "success", "receipt": {"claim": "done"}})
    assert event.status_code == 200
    assert event.json()["provider_events"][0]["independentVerification"] is False


def test_http_completion_claim_is_server_owned():
    client = TestClient(make_app())
    response = client.patch(PATH.replace("/workflows/rsf-fabric-sourcing", "/missions/hub-core-build"), headers=A, json={"patch": {"status": "completed"}, "ledger_state": "VERIFIED_COMPLETE", "evidence": {"state": "verified"}})
    assert response.status_code == 400
    assert response.json()["detail"] == "completion_is_server_owned"
