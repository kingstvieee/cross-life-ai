"""Exercise the production cached-speech function without server startup or paid TTS."""
import ast
import asyncio
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import secrets
from types import SimpleNamespace

from fastapi import HTTPException

AUDIO = b'ID3approved-existing-cache-fixture'
NOW = datetime(2026, 11, 15, tzinfo=timezone.utc)


def cached_function(audio=AUDIO):
    source = Path(__file__).with_name('server.py').read_text(encoding='utf-8')
    tree = ast.parse(source)
    fn = next(node for node in tree.body if isinstance(node, ast.AsyncFunctionDef) and node.name == '_tts_cached_line')
    script = compile('from __future__ import annotations\n' + ast.unparse(fn), '<cached-speech>', 'exec')

    class FakeCache:
        async def find_one(self, query, projection=None):
            return {'key': 'approved.owner.clip', 'visibility': 'private',
                    'expires_at': NOW + timedelta(minutes=5), 'audio': audio}
    scope = {'hashlib': hashlib, 'json': json, 'secrets': secrets,
             'db': SimpleNamespace(tts_cache=FakeCache()),
             'utcnow': lambda: NOW, 'HTTPException': HTTPException}
    exec(script, scope)
    return scope['_tts_cached_line']


def test_existing_cached_clip_returns_exact_audio_sha_without_generating_speech():
    record = asyncio.run(cached_function()('hello', private_user_id='owner'))
    assert record['url'] == '/api/tts/approved.owner.clip.mp3'
    assert record['audioSha256'] == hashlib.sha256(AUDIO).hexdigest()
    assert record['text'] == 'hello'


def test_corrupt_existing_cache_fails_closed():
    for audio in (b'', None, 'not-binary'):
        try:
            asyncio.run(cached_function(audio)('hello', private_user_id='owner'))
        except HTTPException as error:
            assert error.status_code == 502 and error.detail == 'tts_cache_invalid'
        else:
            raise AssertionError('Corrupt cached speech was accepted')
