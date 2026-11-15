from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from guardian_server_integration import install_guardian_core
from test_guardian_server_integration import FakeDB


def test_account_scoped_api_lifecycle():
    db = FakeDB()
    async def authenticate(header):
        if header not in ('Bearer owner', 'Bearer other'):
            raise HTTPException(401, 'invalid_session')
        return {'user_id': header.split()[1], 'portals_enabled': ['work']}
    app = FastAPI()
    install_guardian_core(app, db=db, get_current_user=authenticate)
    client = TestClient(app)
    root = '/api/guardian/life-map'
    headers = {'Authorization': 'Bearer owner'}
    assert client.get(root + '/records?portal=work').status_code == 401
    args = {'fact_id': 'meeting', 'portal': 'work', 'text': 'meeting Tuesday', 'source_id': 'user-note', 'source_span': 'meeting Tuesday'}
    assert client.put(root + '/records', headers=headers, json=args).status_code == 200
    assert client.get(root + '/records?portal=home&query=meeting', headers=headers).status_code == 403
    assert client.get(root + '/records?portal=work&query=meeting', headers={'Authorization': 'Bearer other'}).json() == {'records': []}
    args.update(text='meeting Friday', expected_revision=1)
    assert client.put(root + '/records', headers=headers, json=args).json()['revision'] == 2
    assert client.get(root + '/records?portal=work&query=Tuesday', headers=headers).json() == {'records': []}
    assert client.delete(root + '/records/meeting', headers=headers).json()['deleted']
    assert client.get(root + '/records?portal=work&query=meeting', headers=headers).json() == {'records': []}
    assert client.get(root + '/poppy/discovery?host=example.com', headers=headers).status_code == 400
    # Default consent is off: requesting a notification never enables it.
    assert client.post(root + '/notifications', headers=headers, json={'kind': 'greetings'}).json()['queued'] is False
