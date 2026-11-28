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


def test_overview_and_receipt_do_not_claim_provider_execution():
    import asyncio
    from guardian_life_map import LifeMapStore
    db = FakeDB()
    async def authenticate(header):
        if header not in ('Bearer owner', 'Bearer other'):
            raise HTTPException(401, 'invalid_session')
        return {'user_id':header.split()[1], 'portals_enabled':['work']}
    app = FastAPI()
    install_guardian_core(app, db=db, get_current_user=authenticate)
    client = TestClient(app)
    root = '/api/guardian/life-map'
    headers = {'Authorization':'Bearer owner'}
    overview = client.get(root + '/overview', headers=headers)
    assert overview.status_code == 200
    assert overview.json()['consent'].get('greetings') is False
    store = LifeMapStore(db.guardian_life_map)
    event = asyncio.run(store.enqueue('owner', key='receipt', kind='greetings', decision={'allowed':True}))['event']
    key = event['key']
    assert client.post(root + '/notifications/' + key + '/claim', headers={'Authorization':'Bearer other'}).status_code == 404
    assert client.post(root + '/notifications/' + key + '/claim', headers=headers).json()['claimed'] is False
    grant = asyncio.run(store.claim_notification('owner', key, {'allowed':True}))
    response = client.post(root + '/notifications/' + key + '/receipt', headers=headers, json={'token':grant['token'], 'outcome':'played'})
    assert response.json() == {'state':'played', 'evidence':'client-playback-report'}
    inbox = client.get(root + '/notifications', headers=headers).json()
    assert 'deliveryTokenHash' not in inbox['events'][0]


def test_relationship_notes_surface_is_private_and_respects_revoked_portal_access():
    db = FakeDB()
    relationships_open = True

    async def authenticate(header):
        if header not in ('Bearer owner', 'Bearer other'):
            raise HTTPException(401, 'invalid_session')
        owner = header == 'Bearer owner'
        return {
            'user_id': 'owner' if owner else 'other',
            'portals_enabled': ['relationships', 'work'],
            'portal_privacy': {'relationships': {'access': relationships_open if owner else True}},
        }

    app = FastAPI()
    install_guardian_core(app, db=db, get_current_user=authenticate)
    client = TestClient(app)
    root = '/api/guardian/life-map/records'
    owner = {'Authorization': 'Bearer owner'}
    other = {'Authorization': 'Bearer other'}
    note = {
        'fact_id': 'test-plans', 'portal': 'relationships', 'text': 'Dinner on Friday',
        'source_id': 'Personal note', 'source_span': 'Dinner on Friday',
    }

    assert client.put(root, headers=owner, json=note).status_code == 200
    read = client.get(root + '?portal=relationships', headers=owner)
    assert read.status_code == 200
    assert read.headers['cache-control'] == 'private, no-store'
    assert [item['text'] for item in read.json()['records']] == ['Dinner on Friday']
    assert client.get(root + '?portal=work', headers=owner).json() == {'records': []}
    assert client.get(root + '?portal=relationships', headers=other).json() == {'records': []}
    relationships_open = False
    assert client.get(root + '?portal=relationships', headers=owner).status_code == 403
    assert client.put(root, headers=owner, json={**note, 'expected_revision': 1}).status_code == 403
