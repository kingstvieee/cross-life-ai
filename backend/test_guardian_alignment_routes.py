import asyncio
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import hashlib
from types import SimpleNamespace
import os
from pathlib import Path
import sys
from unittest.mock import patch

import httpx
import pytest
from fastapi import FastAPI, HTTPException
from guardian_alignment import convert_alignment
from guardian_alignment_routes import build_alignment_router, local_alignment

NOW = datetime(2026, 11, 16, tzinfo=timezone.utc)
AUDIO = b'ID3private-speech-fixture'
SHA = hashlib.sha256(AUDIO).hexdigest()


class Cache:
    def __init__(self, doc): self.doc = deepcopy(doc); self.writes = 0
    async def find_one(self, query):
        return deepcopy(self.doc) if self.doc and self.doc['key'] == query['key'] else None
    async def update_one(self, query, update):
        if self.doc and self.doc['key'] == query['key']:
            self.doc.update(deepcopy(update['$set'])); self.writes += 1


def speech(**changes):
    return {'key':'clip.private', 'visibility':'private', 'private_user_id':'owner',
            'expires_at': NOW + timedelta(minutes=1), 'audio':AUDIO, **changes}


def setup(doc=None, runner=None):
    cache = Cache(speech() if doc is None else doc)
    calls = []
    async def auth(token):
        if token != 'Bearer owner': raise HTTPException(401, 'account_required')
        return {'user_id':'owner'}
    async def align(audio):
        calls.append(audio)
        return convert_alignment({'metadata':{'duration':1},
            'mouthCues':[{'start':0,'end':1,'value':'A'}]}, SHA)
    app = FastAPI()
    app.include_router(build_alignment_router(SimpleNamespace(tts_cache=cache), auth,
        lambda *args:None, runner or align, lambda:NOW))
    return app, cache, calls


async def request(app, token='Bearer owner'):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='https://test') as client:
        return await client.post('/guardian/speech-alignment/clip.private',headers={'Authorization':token})


def test_account_bound_alignment_is_cached_without_provider_calls():
    app, cache, calls = setup()
    async def run():
        first = await request(app); second = await request(app)
        assert first.status_code == second.status_code == 200
        assert first.json() == second.json()
        assert first.json()['audioSha256'] == SHA
        assert first.json()['identityApproved'] is False
        assert first.headers['cache-control'] == 'private, no-store'
    asyncio.run(run())
    assert calls == [AUDIO] and cache.writes == 1


@pytest.mark.parametrize('changes,status',[
    ({'private_user_id':'other'},404),({'expires_at':NOW},410),
    ({'expires_at':None},410),({'visibility':'unknown'},404),({'audio':b''},422),
    ({'visibility':'public','content_key':'different'},404)])
def test_invalid_or_other_account_audio_never_reaches_aligner(changes,status):
    app, cache, calls = setup(speech(**changes))
    assert asyncio.run(request(app)).status_code == status
    assert calls == [] and cache.writes == 0


def test_unsigned_request_does_not_read_private_audio():
    app, cache, calls = setup()
    assert asyncio.run(request(app,'Bearer wrong')).status_code == 401
    assert calls == [] and cache.writes == 0


def test_expiry_during_alignment_prevents_cache_and_delivery():
    cache_holder = []
    async def align(audio):
        cache_holder[0].doc['expires_at'] = NOW
        return convert_alignment({'metadata':{'duration':1},'mouthCues':[]},SHA)
    app, cache, _ = setup(runner=align); cache_holder.append(cache)
    assert asyncio.run(request(app)).status_code == 410
    assert cache.writes == 0


def test_wrong_clip_hash_is_never_cached():
    async def align(audio):
        return convert_alignment({'metadata':{'duration':1},'mouthCues':[]},'a'*64)
    app, cache, _ = setup(runner=align)
    assert asyncio.run(request(app)).status_code == 502
    assert cache.writes == 0


def test_duplicate_inflight_request_fails_fast_then_reuses_cache():
    async def run():
        started, release = asyncio.Event(), asyncio.Event()
        async def align(audio):
            started.set(); await release.wait()
            return convert_alignment({'metadata':{'duration':1},'mouthCues':[]},SHA)
        app, cache, _ = setup(runner=align)
        first = asyncio.create_task(request(app)); await started.wait()
        duplicate = await request(app)
        assert duplicate.status_code == 429 and duplicate.headers['retry-after'] == '2'
        release.set(); assert (await first).status_code == 200
        assert (await request(app)).status_code == 200
        assert cache.writes == 1
    asyncio.run(run())


def test_local_process_is_killed_and_private_temp_audio_removed_on_cancel():
    async def run():
        started = asyncio.Event()
        paths = []
        class Process:
            returncode = None
            killed = False
            async def communicate(self):
                started.set(); await asyncio.Event().wait()
            def kill(self): self.killed = True; self.returncode = -9
            async def wait(self): return self.returncode
        child = Process()
        async def create(*args, **kwargs):
            paths.append(Path(args[args.index('-i')+1])); return child
        with patch.dict(os.environ, {'GUARDIAN_RHUBARB_BINARY':sys.executable,
                                    'GUARDIAN_FFMPEG_BINARY':sys.executable}), \
             patch('guardian_alignment_routes.asyncio.create_subprocess_exec',create):
            task = asyncio.create_task(local_alignment(AUDIO))
            await started.wait(); assert paths[0].exists()
            task.cancel()
            with pytest.raises(asyncio.CancelledError): await task
        assert child.killed and not paths[0].exists()
    asyncio.run(run())


def test_revoked_session_during_alignment_never_delivers_private_results():
    revoked = False
    async def auth(token):
        if revoked: raise HTTPException(401,'session_revoked')
        return {'user_id':'owner'}
    async def align(audio):
        nonlocal revoked
        revoked = True
        return convert_alignment({'metadata':{'duration':1},'mouthCues':[]},SHA)
    cache = Cache(speech()); app = FastAPI()
    app.include_router(build_alignment_router(SimpleNamespace(tts_cache=cache),auth,
        lambda *args:None,align,lambda:NOW))
    assert asyncio.run(request(app)).status_code == 401
    assert cache.writes == 0
