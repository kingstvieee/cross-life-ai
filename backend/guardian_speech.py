"""Direct transport for existing Onyx narration; no retries or failure failover."""
import asyncio
import os

import httpx
from fastapi import HTTPException


def speech_provider():
    selected = os.environ.get('GUARDIAN_SPEECH_PROVIDER', '').strip().lower()
    if selected and selected not in ('openai', 'emergent'):
        raise HTTPException(503, 'invalid_speech_provider')
    return selected or ('openai' if os.environ.get('OPENAI_API_KEY', '').strip() else 'emergent')


class DirectNarration:
    def __init__(self, client_factory=None, deadline_seconds=45):
        self.client_factory = client_factory or (lambda: httpx.AsyncClient(
            timeout=httpx.Timeout(30, connect=10), follow_redirects=False))
        self.deadline_seconds = deadline_seconds

    async def generate_speech(self, *, text, model='tts-1', voice='onyx'):
        if not isinstance(text, str) or not text.strip() or len(text) > 4096 or model != 'tts-1' or voice != 'onyx':
            raise HTTPException(422, 'invalid_guardian_narration')
        key = os.environ.get('OPENAI_API_KEY', '').strip()
        if not key:
            raise HTTPException(503, 'guardian_voice_not_configured')
        async def request():
            async with self.client_factory() as client:
                response = await client.post('https://api.openai.com/v1/audio/speech',
                    headers={'Authorization': 'Bearer ' + key},
                    json={'model': model, 'voice': voice, 'input': text, 'response_format': 'mp3'})
                if response.status_code != 200 or not response.headers.get('content-type', '').startswith('audio/') or not response.content:
                    raise HTTPException(502, 'guardian_voice_unavailable')
                return response.content
        try:
            return await asyncio.wait_for(request(), timeout=self.deadline_seconds)
        except TimeoutError:
            raise HTTPException(504, 'guardian_voice_timed_out') from None
        except httpx.HTTPError:
            raise HTTPException(502, 'guardian_voice_unavailable') from None
