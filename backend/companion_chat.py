"""Server-owned chat transport. No client keys, provider failover or tool execution.

Direct OpenAI uses the Responses API with storage disabled. The legacy relay is
selected only before dispatch, never after a failed/partial paid request.
"""
import json
import os
from dataclasses import dataclass

import httpx
from fastapi import HTTPException


@dataclass
class UserMessage:
    text: str


@dataclass
class TextDelta:
    content: str


@dataclass
class StreamDone:
    pass


def chat_provider():
    selected = os.environ.get('GUARDIAN_CHAT_PROVIDER', '').strip().lower()
    if selected and selected not in ('openai', 'emergent'):
        raise HTTPException(503, 'invalid_chat_provider')
    return selected or ('openai' if os.environ.get('OPENAI_API_KEY', '').strip() else 'emergent')


class DirectChat:
    def __init__(self, system_message, client_factory=None):
        self.system_message = system_message
        self.client_factory = client_factory or (lambda: httpx.AsyncClient(
            timeout=httpx.Timeout(60, connect=10), follow_redirects=False))

    async def stream_message(self, message):
        key = os.environ.get('OPENAI_API_KEY', '').strip()
        if not key:
            raise HTTPException(503, 'companion_chat_not_configured')
        payload = {
            'model': os.environ.get('OPENAI_CHAT_MODEL', 'gpt-5.2').strip() or 'gpt-5.2',
            'instructions': self.system_message, 'input': message.text,
            'store': False, 'stream': True, 'max_output_tokens': 2048,
        }
        try:
            async with self.client_factory() as client:
                async with client.stream('POST', 'https://api.openai.com/v1/responses',
                    headers={'Authorization': 'Bearer ' + key, 'Accept': 'text/event-stream'},
                    json=payload) as response:
                    if response.status_code != 200:
                        raise HTTPException(502, 'companion_chat_unavailable')
                    data = []
                    async for line in response.aiter_lines():
                        if line.startswith('data:'):
                            data.append(line[5:].lstrip())
                            if sum(map(len, data)) > 262144:
                                raise HTTPException(502, 'invalid_chat_stream')
                        elif not line and data:
                            event = json.loads('\n'.join(data)); data = []
                            kind = event.get('type')
                            if kind == 'response.output_text.delta':
                                delta = event.get('delta')
                                if not isinstance(delta, str):
                                    raise HTTPException(502, 'invalid_chat_stream')
                                yield TextDelta(delta)
                            elif kind == 'response.completed':
                                if event.get('response', {}).get('status') != 'completed':
                                    raise HTTPException(502, 'incomplete_chat_stream')
                                yield StreamDone()
                                return
                            elif kind in ('error', 'response.failed', 'response.incomplete'):
                                raise HTTPException(502, 'companion_chat_unavailable')
            # A severed stream must never be saved as a completed reply.
            raise HTTPException(502, 'incomplete_chat_stream')
        except (httpx.HTTPError, ValueError, TypeError, AttributeError):
            raise HTTPException(502, 'companion_chat_unavailable') from None


class RelayChat:
    def __init__(self, system_message, session_id, model):
        self.system_message, self.session_id, self.model = system_message, session_id, model

    async def stream_message(self, message):
        key = os.environ.get('EMERGENT_LLM_KEY', '').strip()
        if not key:
            raise HTTPException(503, 'companion_chat_not_configured')
        from emergentintegrations.llm.chat import LlmChat, UserMessage as RelayMessage, TextDelta as RelayDelta, StreamDone as RelayDone
        relay = LlmChat(api_key=key, session_id=self.session_id,
            system_message=self.system_message).with_model('openai', self.model)
        async for event in relay.stream_message(RelayMessage(text=message.text)):
            if isinstance(event, RelayDelta):
                yield TextDelta(event.content)
            elif isinstance(event, RelayDone):
                yield StreamDone()
                return
        raise HTTPException(502, 'incomplete_chat_stream')


def make_chat(system_message, session_id, relay_model='gpt-5.2'):
    if chat_provider() == 'openai':
        return DirectChat(system_message)
    return RelayChat(system_message, session_id, relay_model)
