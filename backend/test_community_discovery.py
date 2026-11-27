from copy import deepcopy
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from community_discovery import build_community_discovery_router

NOW = datetime(2026, 11, 27, tzinfo=timezone.utc)
ROUTE = "/api/community/discovery/toronto"
AUTH = {"Authorization": "Bearer authorized"}
FIXTURE = {"id": "source-A", "name": "Provider event name", "url": "https://www.ticketmaster.ca/show/event/ABC123?tracking=1",
           "dates": {"start": {"dateTime": "2026-11-29T00:30:00Z"}, "status": {"code": "onsale"}},
           "_embedded": {"venues": [{"name": "Provider room", "city": {"name": "Toronto"}, "country": {"countryCode": "CA"}}]}}


def setup(payload, status=200):
    requested = []
    async def owner(auth):
        if auth != AUTH["Authorization"]:
            raise HTTPException(403, "account_required")
        return {"user_id": "owner"}
    def upstream(request):
        requested.append(request)
        return httpx.Response(status, json=payload)
    app = FastAPI()
    app.include_router(build_community_discovery_router(require_account_user=owner, limiter=lambda *_: None,
         http_client=lambda: httpx.AsyncClient(transport=httpx.MockTransport(upstream)), clock=lambda: NOW), prefix="/api")
    return TestClient(app), requested


def test_requires_signed_in_account_and_config_without_external_request(monkeypatch):
    monkeypatch.delenv("TICKETMASTER_DISCOVERY_API_KEY", raising=False)
    client, requests = setup({})
    assert client.get(ROUTE).status_code == 403
    assert client.get(ROUTE, headers=AUTH).json() == {"detail": "ticketmaster_not_configured"}
    assert requests == []


def test_readback_admits_only_real_upcoming_toronto_entries_and_strips_secrets(monkeypatch):
    monkeypatch.setenv("TICKETMASTER_DISCOVERY_API_KEY", "fixture-credential")
    out_of_city, cancelled, unsafe_link, older = deepcopy(FIXTURE), deepcopy(FIXTURE), deepcopy(FIXTURE), deepcopy(FIXTURE)
    out_of_city["id"] = "source-B"
    out_of_city["_embedded"]["venues"][0]["city"]["name"] = "Hamilton"
    cancelled["id"] = "source-C"
    cancelled["dates"]["status"]["code"] = "cancelled"
    unsafe_link.update(id="source-D", url="https://www.ticketmaster.ca.evil.test/event/ZZZ")
    older["id"] = "source-E"
    older["dates"]["start"]["dateTime"] = "2026-11-22T00:00:00Z"
    client, requests = setup({"page": {"totalElements": 6}, "_embedded": {"events": [FIXTURE, FIXTURE, out_of_city, cancelled, unsafe_link, older]}})
    response = client.get(ROUTE, headers=AUTH)
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"
    events = response.json()["events"]
    assert [item["id"] for item in events] == ["source-A", "source-D"]
    assert events[0]["details_url"] == "https://www.ticketmaster.ca/show/event/ABC123"
    assert events[1]["details_url"] is None
    assert "fixture-credential" not in response.text and "owner" not in str(requests[0].url)
    assert requests[0].url.host == "app.ticketmaster.com"
    assert requests[0].method == "GET" and requests[0].url.params["city"] == "Toronto"
    assert requests[0].url.params["countryCode"] == "CA"
    assert "Authorization" not in requests[0].headers


def test_provider_failure_is_distinct_from_genuine_empty_list(monkeypatch):
    monkeypatch.setenv("TICKETMASTER_DISCOVERY_API_KEY", "fixture-credential")
    bad, _ = setup({"fault": {"message": "fixture-credential"}}, 401)
    assert bad.get(ROUTE, headers=AUTH).json() == {"detail": "ticketmaster_discovery_unavailable"}
    malformed, _ = setup({"response": []})
    assert malformed.get(ROUTE, headers=AUTH).status_code == 502
    empty, _ = setup({"page": {"totalElements": 0}})
    assert empty.get(ROUTE, headers=AUTH).json()["events"] == []


def test_provider_query_credential_is_not_logged(monkeypatch, caplog):
    monkeypatch.setenv("TICKETMASTER_DISCOVERY_API_KEY", "fixture-log-secret")
    client, _ = setup({"page": {"totalElements": 0}})
    with caplog.at_level("INFO", logger="httpx"):
        assert client.get(ROUTE, headers=AUTH).status_code == 200
    assert "fixture-log-secret" not in caplog.text
