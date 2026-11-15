import asyncio
import json

import httpx
import pytest
from fastapi import HTTPException

from companion_chat import DirectChat, RelayChat, StreamDone, TextDelta, UserMessage, make_chat


def stream(*events):
    return ''.join('data: ' + json.dumps(event) + '\n\n' for event in events)


def test_direct_transport_uses_private_bounded_request_and_normalized_events(monkeypatch):
    monkeypatch.setenv('OPENAI_API_KEY', 'test-only-not-a-real-key')
    monkeypatch.setenv('OPENAI_CHAT_MODEL', 'configured-model')
    calls = []
    def handler(request):
        calls.append(request)
        assert str(request.url) == 'https://api.openai.com/v1/responses'
        payload = json.loads(request.content)
        assert payload == {'model': 'configured-model', 'instructions': 'authorized context',
            'input': 'hello', 'store': False, 'stream': True, 'max_output_tokens': 2048}
        return httpx.Response(200, text=stream(
            {'type': 'response.created'},
            {'type': 'response.output_text.delta', 'delta': 'Hello'},
            {'type': 'response.output_text.delta', 'delta': ' Stevie.'},
            {'type': 'response.completed', 'response': {'status': 'completed'}}))
    async def run():
        chat = DirectChat('authorized context', lambda: httpx.AsyncClient(transport=httpx.MockTransport(handler)))
        events = [e async for e in chat.stream_message(UserMessage('hello'))]
        assert [e.content for e in events if isinstance(e, TextDelta)] == ['Hello', ' Stevie.']
        assert isinstance(events[-1], StreamDone)
    asyncio.run(run())
    assert len(calls) == 1


@pytest.mark.parametrize('status,body', [
    (401, 'private provider error never returned'), (429, 'rate limited'),
    (200, stream({'type': 'response.output_text.delta', 'delta': 'partial'})),
    (200, stream({'type': 'response.failed', 'response': {'error': 'private'}})),
    (200, stream({'type': 'response.incomplete'})),
    (200, stream({'type': 'response.completed', 'response': {'status': 'incomplete'}})),
    (200, 'data: invalid json\n\n'),
    (200, stream({'type': 'response.output_text.delta', 'delta': 42})),
])
def test_failures_never_emit_done_or_retry_and_redact_provider_errors(monkeypatch, status, body):
    monkeypatch.setenv('OPENAI_API_KEY', 'test-only-not-a-real-key')
    calls = []
    def handler(request):
        calls.append(request)
        return httpx.Response(status, text=body)
    async def run():
        events = []
        with pytest.raises(HTTPException) as error:
            async for event in DirectChat('private', lambda: httpx.AsyncClient(transport=httpx.MockTransport(handler))).stream_message(UserMessage('hello')):
                events.append(event)
        assert error.value.status_code == 502
        assert 'private' not in error.value.detail
        assert not any(isinstance(event, StreamDone) for event in events)
    asyncio.run(run())
    assert len(calls) == 1


def test_provider_selection_and_missing_configuration_do_not_dispatch(monkeypatch):
    monkeypatch.delenv('GUARDIAN_CHAT_PROVIDER', raising=False)
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
    assert isinstance(make_chat('system', 'session'), RelayChat)
    monkeypatch.setenv('OPENAI_API_KEY', 'test-only-not-a-real-key')
    assert isinstance(make_chat('system', 'session'), DirectChat)
    monkeypatch.setenv('GUARDIAN_CHAT_PROVIDER', 'emergent')
    assert isinstance(make_chat('system', 'session'), RelayChat)
    monkeypatch.setenv('GUARDIAN_CHAT_PROVIDER', 'unknown')
    with pytest.raises(HTTPException): make_chat('system', 'session')
    monkeypatch.delenv('OPENAI_API_KEY')
    async def run():
        with pytest.raises(HTTPException) as error:
            async for _ in DirectChat('system', lambda: pytest.fail('must not dispatch')).stream_message(UserMessage('hello')):
                pass
        assert error.value.status_code == 503
    asyncio.run(run())


def test_direct_provider_preserves_each_endpoint_model_unless_explicitly_overridden(monkeypatch):
    monkeypatch.setenv('OPENAI_API_KEY', 'test-only-not-a-real-key')
    monkeypatch.delenv('GUARDIAN_CHAT_PROVIDER', raising=False)
    monkeypatch.delenv('OPENAI_CHAT_MODEL', raising=False)
    assert make_chat('system', 'session').model == 'gpt-5.2'
    assert make_chat('system', 'session', relay_model='gpt-5.6-terra').model == 'gpt-5.6-terra'


def test_whole_request_deadline_stops_trickling_stream_and_closes_transport(monkeypatch):
    monkeypatch.setenv('OPENAI_API_KEY', 'test-only-not-a-real-key')
    closed = []
    class Heartbeats(httpx.AsyncByteStream):
        async def __aiter__(self):
            while True:
                await asyncio.sleep(.005)
                yield b': heartbeat\n\n'
        async def aclose(self):
            closed.append(True)
    def handler(request):
        return httpx.Response(200, stream=Heartbeats())
    async def run():
        client = lambda: httpx.AsyncClient(transport=httpx.MockTransport(handler))
        with pytest.raises(HTTPException) as error:
            async for _ in DirectChat('system', client, deadline_seconds=.03).stream_message(UserMessage('hello')):
                pytest.fail('heartbeats are not content')
        assert error.value.status_code == 504
        assert error.value.detail == 'companion_chat_timed_out'
        assert closed == [True]
    asyncio.run(run())
