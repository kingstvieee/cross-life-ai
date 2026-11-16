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

def make(monkeypatch):
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
        if req.method == 'POST': return httpx.Response(200, json={'access_token': 'private-provider-token', 'refresh_token': 'private-refresh', 'expires_in': 3600})
        return httpx.Response(200, json={'items': [{'id': '1', 'summary': 'Meeting', 'start': {'dateTime': '2026-11-20T13:00:00Z'}, 'attendees': [{'email': 'private@example.test'}], 'description': 'private body'}]})
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
    assert client.post('/api/connections/google/finish/' + flow['flow'], headers={'Authorization': 'Bearer alice'}).status_code == 200
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
