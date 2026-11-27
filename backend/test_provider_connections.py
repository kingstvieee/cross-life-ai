from copy import deepcopy
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest
from cryptography.fernet import Fernet
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from provider_connections import build_provider_router, configuration, seal, unseal, now

def matches(doc, query):
    return all((doc.get(k) is not None and doc[k] > v['$gt']) if isinstance(v, dict) and '$gt' in v else doc.get(k) == v for k, v in query.items())

class Collection:
    def __init__(self): self.docs = []
    async def insert_one(self, doc): self.docs.append(deepcopy({**doc, '_id': len(self.docs) + 1}))
    async def find_one(self, query, projection=None): return next((deepcopy(d) for d in self.docs if matches(d, query)), None)
    async def delete_many(self, query): self.docs = [d for d in self.docs if not matches(d, query)]
    async def delete_one(self, query): await self.find_one_and_delete(query)
    async def find_one_and_delete(self, query):
        for i, d in enumerate(self.docs):
            if matches(d, query): return self.docs.pop(i)
    async def find_one_and_update(self, query, update):
        old = await self.find_one(query)
        if old: await self.update_one(query, update)
        return old
    async def update_one(self, query, update, upsert=False):
        for d in self.docs:
            if matches(d, query):
                d.update(deepcopy(update.get('$set', {})))
                for key in update.get('$unset', {}): d.pop(key, None)
                return
        if upsert: await self.insert_one({**query, **update.get('$set', {})})

def make(monkeypatch, calendar_status=200, calendar_payload=None, on_request=None):
    monkeypatch.setenv('PROVIDER_TOKEN_ENCRYPTION_KEY', Fernet.generate_key().decode())
    monkeypatch.setenv('CONNECT_CALLBACK_ORIGIN', 'https://hub.example.test')
    for provider in ['GOOGLE', 'MICROSOFT']:
        monkeypatch.setenv('CONNECT_' + provider + '_CLIENT_ID', 'test-id')
        monkeypatch.setenv('CONNECT_' + provider + '_CLIENT_SECRET', 'test-secret')
    db = SimpleNamespace(provider_flows=Collection(), provider_connections=Collection())
    requests = []
    async def account(auth):
        if auth not in ('Bearer alice', 'Bearer bob'): raise HTTPException(403, 'real_account_required')
        return {'user_id': auth.split()[1]}
    def respond(req):
        requests.append(req)
        if on_request is not None:
            on_request(req, db)
        active_calendar_status = calendar_status['value'] if isinstance(calendar_status, dict) else calendar_status
        if req.method == 'POST': return httpx.Response(200, json={'access_token': 'private-provider-token', 'refresh_token': 'private-refresh', 'expires_in': 3600})
        if calendar_payload is not None: return httpx.Response(active_calendar_status, json=calendar_payload)
        if 'graph.microsoft.com' in str(req.url): return httpx.Response(active_calendar_status, json={'value': []})
        return httpx.Response(active_calendar_status, json={'items': [{'id': '1', 'summary': 'Meeting', 'start': {'dateTime': '2026-11-20T13:00:00Z'}, 'attendees': [{'email': 'private@example.test'}], 'description': 'private body'}]})
    app = FastAPI(); app.include_router(build_provider_router(db=db, require_account_user=account, limiter=lambda *args: None, http_client=lambda: httpx.AsyncClient(transport=httpx.MockTransport(respond))), prefix='/api')
    return TestClient(app, follow_redirects=False), db, requests

def begin(client, provider='google'):
    response = client.post('/api/connections/' + provider + '/start', headers={'Authorization': 'Bearer alice'})
    assert response.status_code == 200
    body = response.json(); params = parse_qs(urlsplit(body['url']).query)
    return body, params

def test_consent_pkce_encryption_and_readback(monkeypatch):
    client, db, requests = make(monkeypatch); flow, params = begin(client)
    assert params['scope'] == ['https://www.googleapis.com/auth/calendar.events.readonly']
    assert params['code_challenge_method'] == ['S256']
    assert 'client_secret' not in flow['url']
    assert client.get('/api/connections/google/callback', params={'state': params['state'][0], 'code': 'code'}).status_code == 200
    assert client.get('/api/connections/google/callback', params={'state': params['state'][0], 'code': 'code'}).status_code == 400
    assert len(requests) == 1
    assert client.post('/api/connections/google/finish/' + flow['flow'], headers={'Authorization': 'Bearer bob'}).status_code == 409
    verified = client.post('/api/connections/google/finish/' + flow['flow'], headers={'Authorization': 'Bearer alice'})
    assert verified.status_code == 200 and verified.json()['readback_verified'] is True
    assert requests[-1].method == 'GET' and requests[-1].headers['Authorization'] == 'Bearer private-provider-token'
    assert 'private-provider-token' not in str(db.provider_connections.docs)
    read = client.get('/api/connections/google/calendar', headers={'Authorization': 'Bearer alice'})
    assert read.status_code == 200 and read.json()['events'][0]['title'] == 'Meeting'
    assert read.headers['cache-control'] == 'no-store'
    assert 'attendees' not in read.text and 'private body' not in read.text and 'private-provider-token' not in read.text
    assert requests[-1].headers['Authorization'] == 'Bearer private-provider-token'
    assert client.get('/api/connections/google/calendar', headers={'Authorization': 'Bearer bob'}).status_code == 409
    assert client.delete('/api/connections/google', headers={'Authorization': 'Bearer alice'}).status_code == 200
    assert not db.provider_connections.docs

def test_guest_unknown_provider_and_unconfigured_fail_closed(monkeypatch):
    client, db, requests = make(monkeypatch)
    assert client.post('/api/connections/google/start').status_code == 403
    assert client.post('/api/connections/arbitrary/start', headers={'Authorization': 'Bearer alice'}).status_code == 404
    monkeypatch.delenv('CONNECT_GOOGLE_CLIENT_SECRET')
    assert client.post('/api/connections/google/start', headers={'Authorization': 'Bearer alice'}).status_code == 503
    assert not requests and not db.provider_flows.docs

def test_callback_provider_binding_expiry_and_denied_consent(monkeypatch):
    client, db, requests = make(monkeypatch); flow, params = begin(client)
    assert client.get('/api/connections/microsoft/callback', params={'state': params['state'][0], 'code': 'code'}).status_code == 400
    assert client.get('/api/connections/google/callback', params={'state': params['state'][0], 'error': 'access_denied'}).status_code == 400
    assert not db.provider_flows.docs and not requests
    flow, params = begin(client)
    db.provider_flows.docs[0]['expires_at'] = now()
    assert client.get('/api/connections/google/callback', params={'state': params['state'][0], 'code': 'code'}).status_code == 400

def test_vault_integrity_and_https_callback(monkeypatch):
    make(monkeypatch); encrypted = seal({'access_token': 'example'})
    assert unseal(encrypted)['access_token'] == 'example'
    with pytest.raises(HTTPException): unseal(encrypted[:-4] + 'bad!')
    monkeypatch.setenv('CONNECT_CALLBACK_ORIGIN', 'https://hub.example.test/untrusted')
    with pytest.raises(HTTPException): configuration('google')

def test_microsoft_has_read_only_scope(monkeypatch):
    client, _, _ = make(monkeypatch); _, params = begin(client, 'microsoft')
    assert params['scope'] == ['offline_access Calendars.ReadBasic']

def test_invalid_calendar_scope_cannot_claim_connected(monkeypatch):
    client, db, requests = make(monkeypatch, calendar_status=403)
    flow, params = begin(client)
    assert client.get('/api/connections/google/callback', params={'state': params['state'][0], 'code': 'approved'}).status_code == 200
    denied = client.post('/api/connections/google/finish/' + flow['flow'], headers={'Authorization': 'Bearer alice'})
    assert denied.status_code == 409 and denied.json()['detail'] == 'provider_reconnect_required'
    assert not db.provider_connections.docs
    assert client.get('/api/connections', headers={'Authorization': 'Bearer alice'}).json()[0]['connected'] is False

def test_provider_must_return_valid_calendar_readback(monkeypatch):
    client, db, requests = make(monkeypatch, calendar_payload={'unrelated': 'not calendar events'})
    flow, params = begin(client)
    assert client.get('/api/connections/google/callback', params={'state': params['state'][0], 'code': 'approved'}).status_code == 200
    bad = client.post('/api/connections/google/finish/' + flow['flow'], headers={'Authorization': 'Bearer alice'})
    assert bad.status_code == 502 and bad.json()['detail'] == 'provider_read_unavailable'
    assert not db.provider_connections.docs

def test_microsoft_empty_calendar_can_still_verify_valid_read_access(monkeypatch):
    client, db, requests = make(monkeypatch)
    flow, params = begin(client, 'microsoft')
    assert client.get('/api/connections/microsoft/callback', params={'state': params['state'][0], 'code': 'approved'}).status_code == 200
    finish = client.post('/api/connections/microsoft/finish/' + flow['flow'], headers={'Authorization': 'Bearer alice'})
    assert finish.status_code == 200 and finish.json()['readback_verified'] is True
    assert db.provider_connections.docs
    assert 'graph.microsoft.com' in str(requests[-1].url)

def test_revoked_google_calendar_token_transitions_to_reconnect_required(monkeypatch):
    state = {'value': 200}
    client, db, requests = make(monkeypatch, calendar_status=state)
    flow, params = begin(client)
    assert client.get('/api/connections/google/callback', params={'state': params['state'][0], 'code': 'approved'}).status_code == 200
    assert client.post('/api/connections/google/finish/' + flow['flow'], headers={'Authorization': 'Bearer alice'}).status_code == 200
    assert client.get('/api/connections', headers={'Authorization': 'Bearer alice'}).json()[0]['connected'] is True
    state['value'] = 401
    denied = client.get('/api/connections/google/calendar', headers={'Authorization': 'Bearer alice'})
    assert denied.status_code == 409 and denied.json()['detail'] == 'provider_reconnect_required'
    record = db.provider_connections.docs[0]
    assert 'tokens' not in record and record['reconnect_required'] is True
    entry = client.get('/api/connections', headers={'Authorization': 'Bearer alice'}).json()[0]
    assert entry['connected'] is False and entry['reconnect_required'] is True
    assert client.get('/api/connections/google/calendar', headers={'Authorization': 'Bearer alice'}).status_code == 409


def test_missing_refresh_token_invalidates_expired_connection(monkeypatch):
    client, db, requests = make(monkeypatch)
    flow, params = begin(client)
    assert client.get('/api/connections/google/callback', params={'state': params['state'][0], 'code': 'approved'}).status_code == 200
    assert client.post('/api/connections/google/finish/' + flow['flow'], headers={'Authorization': 'Bearer alice'}).status_code == 200
    record = db.provider_connections.docs[0]
    token = unseal(record['tokens'])
    token.pop('refresh_token', None)
    token['expires_at'] = 0
    record['tokens'] = seal(token)
    denied = client.get('/api/connections/google/calendar', headers={'Authorization': 'Bearer alice'})
    assert denied.status_code == 409
    assert record['reconnect_required'] is True
    assert 'tokens' not in record


def test_transient_calendar_failure_keeps_valid_saved_connection(monkeypatch):
    state = {'value': 200}
    client, db, requests = make(monkeypatch, calendar_status=state)
    flow, params = begin(client)
    assert client.get('/api/connections/google/callback', params={'state': params['state'][0], 'code': 'approved'}).status_code == 200
    assert client.post('/api/connections/google/finish/' + flow['flow'], headers={'Authorization': 'Bearer alice'}).status_code == 200
    state['value'] = 503
    error = client.get('/api/connections/google/calendar', headers={'Authorization': 'Bearer alice'})
    assert error.status_code == 502
    assert 'tokens' in db.provider_connections.docs[0]
    entry = client.get('/api/connections', headers={'Authorization': 'Bearer alice'}).json()[0]
    assert entry['connected'] is True

def test_corrupt_link_without_token_is_not_reported_connected(monkeypatch):
    client, db, requests = make(monkeypatch)
    flow, params = begin(client)
    assert client.get('/api/connections/google/callback', params={'state': params['state'][0], 'code': 'approved'}).status_code == 200
    assert client.post('/api/connections/google/finish/' + flow['flow'], headers={'Authorization': 'Bearer alice'}).status_code == 200
    db.provider_connections.docs[0].pop('tokens', None)
    response = client.get('/api/connections', headers={'Authorization': 'Bearer alice'})
    assert response.status_code == 200
    status = response.json()[0]
    assert status['connected'] is False and status['reconnect_required'] is True
    assert 'tokens' not in status

def test_calendar_provider_malformed_response_fails_without_leaking_private_data(monkeypatch):
    payload = {'items': []}
    client, db, requests = make(monkeypatch, calendar_payload=payload)
    flow, params = begin(client)
    assert client.get('/api/connections/google/callback', params={'state': params['state'][0], 'code': 'approved'}).status_code == 200
    assert client.post('/api/connections/google/finish/' + flow['flow'], headers={'Authorization': 'Bearer alice'}).status_code == 200
    payload.clear()
    payload.update({'items': 'not-an-events-array', 'description': 'secret'})
    invalid = client.get('/api/connections/google/calendar', headers={'Authorization': 'Bearer alice'})
    assert invalid.status_code == 502
    assert invalid.json()['detail'] == 'provider_read_unavailable'
    assert 'secret' not in invalid.text
    assert 'tokens' in db.provider_connections.docs[0]  # transient corrupt read is not authorization revocation

def test_calendar_finish_rejects_non_event_records_before_saving_auth(monkeypatch):
    client, db, requests = make(monkeypatch, calendar_payload={'items': [None, 'bad']})
    flow, params = begin(client)
    assert client.get('/api/connections/google/callback', params={'state': params['state'][0], 'code': 'approved'}).status_code == 200
    denied = client.post('/api/connections/google/finish/' + flow['flow'], headers={'Authorization': 'Bearer alice'})
    assert denied.status_code == 502
    assert denied.json()['detail'] == 'provider_read_unavailable'
    assert not db.provider_connections.docs


@pytest.mark.parametrize("stage", ["refresh", "read"])
def test_disconnect_during_request_prevents_stale_calendar_disclosure(monkeypatch, stage):
    armed = False

    def disconnect(req, db):
        method = "POST" if stage == "refresh" else "GET"
        if armed and req.method == method:
            db.provider_connections.docs.clear()

    client, db, requests = make(monkeypatch, on_request=disconnect)
    flow, params = begin(client)
    headers = {"Authorization": "Bearer alice"}
    callback = client.get("/api/connections/google/callback",
                          params={"state": params["state"][0], "code": "approved"})
    assert callback.status_code == 200
    assert client.post("/api/connections/google/finish/" + flow["flow"], headers=headers).status_code == 200
    if stage == "refresh":
        record = db.provider_connections.docs[0]
        record["tokens"] = seal({**unseal(record["tokens"]), "expires_at": 0})
    armed = True
    requests.clear()
    reply = client.get("/api/connections/google/calendar", headers=headers)
    assert reply.status_code == 409
    assert reply.json()["detail"] == "provider_reconnect_required"
    assert [req.method for req in requests] == ["POST" if stage == "refresh" else "GET"]
    assert not db.provider_connections.docs


def test_canva_consent_uses_distinct_scope_and_returns_only_verified_metadata(monkeypatch):
    from base64 import b64decode
    monkeypatch.setenv('CONNECT_CANVA_CLIENT_ID', 'canva-id')
    monkeypatch.setenv('CONNECT_CANVA_CLIENT_SECRET', 'canva-secret')
    designs = {
        'items': [{'id': 'C1', 'title': 'Campaign board', 'owner': {'id': 'private-owner'},
                   'urls': {'edit_url': 'https://example.test/private-edit'}, 'thumbnail': {'url': 'https://example.test/private-image'}}],
        'continuation': 'private-continuation',
    }
    client, db, requests = make(monkeypatch, calendar_payload=designs)
    auth = {'Authorization': 'Bearer alice'}
    flow, params = begin(client, 'canva')
    assert urlsplit(flow['url']).path == '/api/oauth/authorize'
    assert params['scope'] == ['design:meta:read']
    assert params['code_challenge_method'] == ['s256']
    assert 'canva-secret' not in flow['url']
    response = client.get('/api/connections/canva/callback', params={'state': params['state'][0], 'code': 'approved'})
    assert response.status_code == 200
    assert 'Canva permission received' in response.text
    token_request = requests[-1]
    assert str(token_request.url) == 'https://api.canva.com/rest/v1/oauth/token'
    assert b64decode(token_request.headers['Authorization'].split()[1]) == b'canva-id:canva-secret'
    fields = parse_qs(token_request.content.decode())
    assert fields['redirect_uri'] == ['https://hub.example.test/api/connections/canva/callback']
    assert 'client_secret' not in fields and 'code_verifier' in fields
    assert client.get('/api/connections/canva/designs', headers=auth).status_code == 409
    assert client.post('/api/connections/canva/finish/' + flow['flow'], headers={'Authorization': 'Bearer bob'}).status_code == 409
    connected = client.post('/api/connections/canva/finish/' + flow['flow'], headers=auth)
    assert connected.json() == {'connected': True, 'capability': 'design_metadata_read_only', 'readback_verified': True}
    assert requests[-1].url.params['sort_by'] == 'modified_descending'
    assert 'private-provider-token' not in str(db.provider_connections.docs)
    canva = client.get('/api/connections/canva/designs', headers=auth)
    assert canva.status_code == 200
    assert canva.json()['designs'] == [{'id': 'C1', 'title': 'Campaign board'}]
    assert canva.headers['cache-control'] == 'no-store'
    assert 'private-' not in canva.text
    assert client.get('/api/connections/canva/calendar', headers=auth).status_code == 404
    assert client.get('/api/connections/canva/designs', headers={'Authorization': 'Bearer bob'}).status_code == 409
    assert client.delete('/api/connections/canva', headers=auth).status_code == 200
    assert client.get('/api/connections/canva/designs', headers=auth).status_code == 409


def test_canva_does_not_connect_when_provider_readback_has_wrong_shape(monkeypatch):
    monkeypatch.setenv('CONNECT_CANVA_CLIENT_ID', 'canva-id')
    monkeypatch.setenv('CONNECT_CANVA_CLIENT_SECRET', 'canva-secret')
    client, db, _ = make(monkeypatch, calendar_payload={'items': [{'title': 'No design ID'}]})
    flow, params = begin(client, 'canva')
    assert client.get('/api/connections/canva/callback', params={'state': params['state'][0], 'code': 'approved'}).status_code == 200
    denied = client.post('/api/connections/canva/finish/' + flow['flow'], headers={'Authorization': 'Bearer alice'})
    assert denied.status_code == 502
    assert not db.provider_connections.docs
