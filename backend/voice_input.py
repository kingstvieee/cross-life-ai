"""Bounded ephemeral microphone transcription; audio is never persisted here."""
import base64
import binascii
import os
import httpx
from fastapi import HTTPException
MAX_AUDIO = 5 * 1024 * 1024
MIMES = {'audio/mp4': 'm4a', 'audio/m4a': 'm4a', 'audio/webm': 'webm', 'audio/wav': 'wav'}
async def transcribe(encoded, mime, client_factory=None):
    if not isinstance(mime, str) or mime not in MIMES or not isinstance(encoded, str) or len(encoded) > MAX_AUDIO * 4 // 3 + 4:
        raise HTTPException(422, 'invalid_recording')
    try:
        data = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error):
        raise HTTPException(422, 'invalid_recording') from None
    if not data or len(data) > MAX_AUDIO:
        raise HTTPException(422, 'invalid_recording')
    key = os.environ.get('OPENAI_API_KEY', '').strip()
    if not key:
        raise HTTPException(503, 'voice_input_not_configured')
    factory = client_factory or (lambda: httpx.AsyncClient(timeout=45, follow_redirects=False))
    try:
        async with factory() as client:
            result = await client.post('https://api.openai.com/v1/audio/transcriptions', headers={'Authorization': 'Bearer ' + key}, data={'model': 'gpt-4o-mini-transcribe', 'response_format': 'json'}, files={'file': ('recording.' + MIMES[mime], data, mime)})
        if result.status_code != 200:
            raise HTTPException(502, 'transcription_unavailable')
        payload = result.json()
        text = payload.get('text') if isinstance(payload, dict) else None
        if not isinstance(text, str) or len(text) > 4000:
            raise HTTPException(502, 'invalid_transcription')
        return text.strip()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(502, 'transcription_unavailable') from None
