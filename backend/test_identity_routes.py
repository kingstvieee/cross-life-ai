import base64
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import hashlib
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from identity_routes import FLOW_COOKIE, SESSION_COOKIE, build_identity_router, digest


class Collection:
    def __init__(self):
        self.docs = []

    async def insert_one(self, document):
        self.docs.append(deepcopy(document))

    async def find_one(self, query, projection=None):
        return next((deepcopy(d) for d in self.docs if all(d.get(k) == v for k, v in query.items())), None)

    async def find_one_and_delete(self, query):
        for index, document in enumerate(self.docs):
            if all(document.get(k) == v for k, v in query.items()):
                return self.docs.pop(index)
        return None


def make(monkeypatch, *, verified=True):
    env = {
        "AUTH_AUTHORIZE_URL": "https://identity.example.test/authorize",
        "AUTH_TOKEN_URL": "https://identity.example.test/token",
        "AUTH_USERINFO_URL": "https://identity.example.test/userinfo",
        "AUTH_ISSUER": "https://identity.example.test/",
        "AUTH_CLIENT_ID": "test-client", "AUTH_CLIENT_SECRET": "test-secret",
        "AUTH_CALLBACK_URL": "https://api.example.test/api/auth/callback",
        "AUTH_APP_URL": "https://app.example.test/",
        "AUTH_CONNECTION_GOOGLE": "google-oauth2",
        "AUTH_CONNECTION_MICROSOFT": "microsoft",
        "AUTH_CONNECTION_EMAIL": "email-account",
    }
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    db = SimpleNamespace(auth_flows=Collection(), users=Collection(), user_sessions=Collection())
    requests = []

    def provider(request):
        requests.append(request)
        if request.url.path == "/token":
            return httpx.Response(200, json={"access_token": "provider-only-token"})
        return httpx.Response(200, json={"sub": "stable-subject", "email": "test@example.test",
                                        "email_verified": verified, "name": "Test User"})

    app = FastAPI()
    app.include_router(build_identity_router(db=db, http_client=lambda: httpx.AsyncClient(transport=httpx.MockTransport(provider))), prefix="/api")
    return TestClient(app, base_url="https://api.example.test", follow_redirects=False), db, requests


def begin(client, method="google"):
    r = client.get("/api/auth/start/" + method)
    assert r.status_code == 302
    params = parse_qs(urlsplit(r.headers["location"]).query)
    return r, params


@pytest.mark.parametrize("provider", ["google", "microsoft", "email"])
def test_code_pkce_verified_identity_and_private_session_cookie(monkeypatch, provider):
    client, db, requests = make(monkeypatch)
    start, params = begin(client, provider)
    assert params["code_challenge_method"] == ["S256"]
    assert "HttpOnly" in start.headers["set-cookie"] and "Secure" in start.headers["set-cookie"]
    verifier = db.auth_flows.docs[0]["verifier"]
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
    assert params["code_challenge"] == [challenge]
    response = client.get("/api/auth/callback", params={"state": params["state"][0], "code": "provider-code"})
    assert response.status_code == 303
    assert response.headers["location"] == "https://app.example.test/"
    assert SESSION_COOKIE in response.headers["set-cookie"]
    assert "HttpOnly" in response.headers["set-cookie"]
    assert "provider-only-token" not in response.headers["location"]
    assert len(db.users.docs) == len(db.user_sessions.docs) == 1
    assert all(p["share"] is False for p in db.users.docs[0]["portal_privacy"].values())
    form = parse_qs(requests[0].content.decode())
    assert form["code_verifier"] == [verifier]
    assert requests[1].headers["authorization"] == "Bearer provider-only-token"
    assert not db.auth_flows.docs
    replay = client.get("/api/auth/callback", params={"state": params["state"][0], "code": "provider-code"})
    assert replay.status_code == 401


def test_missing_or_wrong_browser_binding_cannot_exchange(monkeypatch):
    client, db, requests = make(monkeypatch)
    _, params = begin(client)
    client.cookies.clear()
    denied = client.get("/api/auth/callback", params={"state": params["state"][0], "code": "provider-code"})
    assert denied.status_code == 401
    assert requests == [] and db.user_sessions.docs == []


def test_expired_flow_and_unverified_email_never_create_session(monkeypatch):
    client, db, requests = make(monkeypatch)
    _, params = begin(client)
    db.auth_flows.docs[0]["expires_at"] = datetime.now(timezone.utc) - timedelta(minutes=1)
    assert client.get("/api/auth/callback", params={"state": params["state"][0], "code": "x"}).status_code == 401
    assert requests == []
    client, db, _ = make(monkeypatch, verified=False)
    _, params = begin(client)
    assert client.get("/api/auth/callback", params={"state": params["state"][0], "code": "x"}).status_code == 401
    assert db.user_sessions.docs == []


def test_missing_config_and_non_https_provider_fail_closed(monkeypatch):
    client, db, _ = make(monkeypatch)
    monkeypatch.delenv("AUTH_CLIENT_SECRET")
    assert client.get("/api/auth/start/google").status_code == 503
    assert all(not p["enabled"] for p in client.get("/api/auth/providers").json()["providers"])
    assert db.auth_flows.docs == []
    monkeypatch.setenv("AUTH_CLIENT_SECRET", "test-secret")
    monkeypatch.setenv("AUTH_TOKEN_URL", "http://identity.example.test/token")
    assert client.get("/api/auth/start/email").status_code == 503


def test_email_collision_requires_explicit_linking(monkeypatch):
    client, db, _ = make(monkeypatch)
    db.users.docs.append({"user_id": "legacy-user", "email": "test@example.test"})
    _, params = begin(client)
    response = client.get("/api/auth/callback", params={"state": params["state"][0], "code": "provider-code"})
    assert response.status_code == 409
    assert db.user_sessions.docs == []
    assert db.users.docs[0]["user_id"] == "legacy-user"
