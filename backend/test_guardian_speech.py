import asyncio
import ast
import json
import os
from pathlib import Path
from unittest.mock import patch

import httpx
import pytest
from fastapi import HTTPException

from guardian_speech import DirectNarration, speech_provider


def test_selection_and_missing_key_never_dispatch():
    with patch.dict(os.environ, {'OPENAI_API_KEY': '', 'GUARDIAN_SPEECH_PROVIDER': ''}):
        assert speech_provider() == 'emergent'
        with pytest.raises(HTTPException) as error:
            asyncio.run(DirectNarration().generate_speech(text='Hello'))
        assert error.value.status_code == 503
    with patch.dict(os.environ, {'OPENAI_API_KEY': 'test-only', 'GUARDIAN_SPEECH_PROVIDER': ''}):
        assert speech_provider() == 'openai'
    with patch.dict(os.environ, {'GUARDIAN_SPEECH_PROVIDER': 'unknown'}):
        with pytest.raises(HTTPException):
            speech_provider()


def test_direct_narration_preserves_voice_and_fixed_origin():
    calls = []
    def handle(request):
        calls.append(request)
        return httpx.Response(200, headers={'content-type': 'audio/mpeg'}, content=b'ID3test')
    factory = lambda: httpx.AsyncClient(transport=httpx.MockTransport(handle))
    with patch.dict(os.environ, {'OPENAI_API_KEY': 'test-only'}):
        assert asyncio.run(DirectNarration(factory).generate_speech(text='Hello')) == b'ID3test'
    assert len(calls) == 1
    assert str(calls[0].url) == 'https://api.openai.com/v1/audio/speech'
    assert json.loads(calls[0].content) == {'model': 'tts-1', 'voice': 'onyx', 'input': 'Hello', 'response_format': 'mp3'}


@pytest.mark.parametrize('status,headers,body', [(302, {'location': 'https://other.example'}, b''), (401, {}, b'secret-provider-error'), (200, {'content-type': 'application/json'}, b'{}'), (200, {'content-type': 'audio/mpeg'}, b'')])
def test_invalid_audio_fails_once_without_body_leak(status, headers, body):
    calls = []
    def handle(request):
        calls.append(request)
        return httpx.Response(status, headers=headers, content=body)
    factory = lambda: httpx.AsyncClient(transport=httpx.MockTransport(handle))
    with patch.dict(os.environ, {'OPENAI_API_KEY': 'test-only'}):
        with pytest.raises(HTTPException) as error:
            asyncio.run(DirectNarration(factory).generate_speech(text='Hello'))
    assert len(calls) == 1
    assert error.value.detail == 'guardian_voice_unavailable'


def test_deadline_cancels_and_closes_transport():
    closed = []
    class Client:
        async def __aenter__(self): return self
        async def __aexit__(self, *args): closed.append(True)
        async def post(self, *args, **kwargs): await asyncio.sleep(5)
    with patch.dict(os.environ, {'OPENAI_API_KEY': 'test-only'}):
        with pytest.raises(HTTPException) as error:
            asyncio.run(DirectNarration(Client, deadline_seconds=.01).generate_speech(text='Hello'))
    assert error.value.status_code == 504
    assert closed == [True]


def test_server_selects_direct_without_importing_relay():
    tree = ast.parse(Path(__file__).with_name('server.py').read_text())
    definition = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == '_tts')
    namespace = {'_tts_client': None}
    exec(compile(ast.Module(body=[definition], type_ignores=[]), 'server.py', 'exec'), namespace)
    with patch.dict(os.environ, {'OPENAI_API_KEY': 'test-only', 'GUARDIAN_SPEECH_PROVIDER': ''}):
        assert isinstance(namespace['_tts'](), DirectNarration)


@pytest.mark.parametrize('arguments', [{'text': ''}, {'text': 'x' * 4097}, {'text': 'Hello', 'voice': 'unknown'}, {'text': 'Hello', 'model': 'unknown'}])
def test_invalid_input_cannot_dispatch(arguments):
    with pytest.raises(HTTPException) as error:
        asyncio.run(DirectNarration().generate_speech(**arguments))
    assert error.value.status_code == 422
