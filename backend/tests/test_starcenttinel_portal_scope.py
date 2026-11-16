"""Seven Guardian Core portal admission tests (no live provider calls)."""
import pytest
from fastapi.testclient import TestClient
from guardian_routes import GUARDIAN_CORE_PORTALS
from test_guardian_routes import make_app

PATH = "/api/guardian/core/workflows/rsf-fabric-sourcing/portal-weave/contributions"
HEADERS = {"Authorization": "Bearer user-a"}

def payload(portal):
    return {
        "contribution_id": "test-contribution",
        "portal_id": portal,
        "kind": "observation",
        "summary": "validation only",
        "version": "v1",
        "privacy_scope": "private",
        "authority_scopes": [],
        "idempotency_key": "portal-test",
    }

def test_exactly_seven_canonical_portals():
    assert GUARDIAN_CORE_PORTALS == {
        "creativity", "work", "home", "wellbeing",
        "relationships", "community", "style",
    }

@pytest.mark.parametrize("portal", ["", "admin", "staarhealth", "WORK", "unknown"])
def test_unknown_portals_rejected_before_store_write(portal):
    client = TestClient(make_app())
    result = client.post(PATH, headers=HEADERS, json=payload(portal))
    assert result.status_code == 400
    assert result.json()["detail"] == "guardian_unknown_portal"
