import base64
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import hashlib
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest
from fastapi import FastAPI, Request
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
        "AUTH_CONNECTION_YAHOO": "yahoo",
        "AUTH_CONNECTION_EMAIL": "email-account",
    }
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    db = SimpleNamespace(auth_flows=Collection(), auth_native_grants=Collection(), users=Collection(), user_sessions=Collection())
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


def test_native_handoff_requires_pkce_and_is_single_use(monkeypatch):
    client, db, _ = make(monkeypatch)
    monkeypatch.setenv("AUTH_NATIVE_REDIRECT_URL", "frontend://auth-complete")
    verifier = "a" * 64
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
    start = client.get("/api/auth/start/google", params={"native_challenge": challenge})
    state = parse_qs(urlsplit(start.headers["location"]).query)["state"][0]
    result = client.get("/api/auth/callback", params={"state": state, "code": "provider-code"})
    target = urlsplit(result.headers["location"])
    assert target.scheme == "frontend" and target.netloc == "auth-complete"
    grant = parse_qs(target.query)["code"][0]
    assert not db.user_sessions.docs
    assert "session_token" not in target.query
    bad = client.post("/api/auth/native/exchange", json={"code": grant, "verifier": "b" * 64})
    assert bad.status_code == 401
    good = client.post("/api/auth/native/exchange", json={"code": grant, "verifier": verifier})
    assert good.status_code == 200
    assert good.json()["user"]["is_demo"] is False
    assert "no-store" in good.headers["cache-control"]
    assert len(db.user_sessions.docs) == 1
    assert client.post("/api/auth/native/exchange", json={"code": grant, "verifier": verifier}).status_code == 401


def test_native_disabled_until_callback_configured(monkeypatch):
    client, _, _ = make(monkeypatch)
    monkeypatch.delenv("AUTH_NATIVE_REDIRECT_URL", raising=False)
    assert client.get("/api/auth/providers").json()["nativeEnabled"] is False
    assert client.get("/api/auth/start/google", params={"native_challenge": "a" * 43}).status_code == 503


def test_apple_is_separately_configured(monkeypatch):
    client, _, _ = make(monkeypatch)
    monkeypatch.delenv("AUTH_CONNECTION_APPLE", raising=False)
    providers = {p["id"]: p["enabled"] for p in client.get("/api/auth/providers").json()["providers"]}
    assert providers["apple"] is False
    monkeypatch.setenv("AUTH_CONNECTION_APPLE", "apple")
    assert client.get("/api/auth/start/apple").status_code == 302


@pytest.mark.parametrize("provider", ["google", "microsoft", "yahoo", "email"])
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


def test_yahoo_requires_its_own_connection_and_outlook_uses_microsoft(monkeypatch):
    client, _, _ = make(monkeypatch)
    monkeypatch.delenv('AUTH_CONNECTION_YAHOO')
    providers = {p['id']: p['enabled'] for p in client.get('/api/auth/providers').json()['providers']}
    assert providers['yahoo'] is False and providers['microsoft'] is True
    assert client.get('/api/auth/start/yahoo').status_code == 503
    _, microsoft = begin(client, 'microsoft')
    assert microsoft['connection'] == ['microsoft']
    monkeypatch.setenv('AUTH_CONNECTION_YAHOO', 'yahoo-social')
    _, yahoo = begin(client, 'yahoo')
    assert yahoo['connection'] == ['yahoo-social']


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


def test_form_post_callback_uses_same_binding_pkce_and_single_use_state(monkeypatch):
    client, db, requests = make(monkeypatch)
    start, params = begin(client)
    assert 'SameSite=none' in start.headers['set-cookie']
    state = params['state'][0]
    result = client.post('/api/auth/callback', data={'state': state, 'code': 'form-code'})
    assert result.status_code == 303
    assert len(db.user_sessions.docs) == 1
    assert parse_qs(requests[0].content.decode())['code'] == ['form-code']
    assert client.post('/api/auth/callback', data={'state': state, 'code': 'form-code'}).status_code == 401


def test_form_post_without_browser_binding_cannot_consume_flow(monkeypatch):
    client, db, requests = make(monkeypatch)
    _, params = begin(client)
    client.cookies.clear()
    result = client.post('/api/auth/callback', data={'state': params['state'][0], 'code': 'form-code'})
    assert result.status_code == 401
    assert len(db.auth_flows.docs) == 1
    assert db.user_sessions.docs == [] and requests == []


def test_new_account_defaults_to_atlas_but_existing_guardian_is_preserved(monkeypatch):
    client, db, _ = make(monkeypatch)
    _, params = begin(client)
    client.get('/api/auth/callback', params={'state': params['state'][0], 'code': 'code'})
    assert db.users.docs[0]['companion'] == 'atlas'
    db.users.docs[0]['companion'] = 'guardian'
    _, params = begin(client)
    client.get('/api/auth/callback', params={'state': params['state'][0], 'code': 'code'})
    assert db.users.docs[0]['companion'] == 'guardian'


def test_multipart_parser_is_installed_and_parses_apple_form_post():
    """Fail clearly before a missing or shadowed parser breaks Apple callbacks."""
    try:
        import python_multipart  # noqa: F401
    except ModuleNotFoundError:
        try:
            import multipart  # noqa: F401
        except ModuleNotFoundError as exc:
            pytest.fail(
                "python-multipart is missing. Apple's form_post callback requires "
                "request.form(). Install backend/requirements.txt (which pins "
                "python-multipart==0.0.32) in both CI and the backend environment. "
                f"Original error: {exc}"
            )

    probe = FastAPI()

    @probe.post('/_probe/form')
    async def parse_form(request: Request):
        form = await request.form()
        return {'state': form.get('state'), 'code': form.get('code')}

    with TestClient(probe) as client:
        response = client.post(
            '/_probe/form', data={'state': 'state-value', 'code': 'code-value'}
        )
    assert response.status_code == 200, response.text
    assert response.json() == {'state': 'state-value', 'code': 'code-value'}
