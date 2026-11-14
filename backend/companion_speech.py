"""Original companion delivery; credentials stay on the server.

Speech API bridge supported until 2027-01-06. Realtime migration is a separate
transport change, never achieved by passing a Realtime model to /audio/speech.
"""
import os
import httpx
from fastapi import HTTPException

MODEL = 'gpt-4o-mini-tts'
PROFILES = {
    'atlas': {'voice': 'cedar', 'instructions': 'Speak in a natural contemporary British accent. Masculine, composed, quietly assertive, articulate and warm. Use measured conversational pacing and subtle understated wit. This is an original character; do not imitate an actor or fictional performance.'},
    'kaia': {'voice': 'marin', 'instructions': 'Speak in a natural warm feminine voice. Soft, elegant, assured and emotionally present, with restrained playful wit. Use smooth conversational pacing, never exaggerated. This is an original character; do not imitate any celebrity.'},
    'guardian': {'voice': 'cedar', 'instructions': 'Speak naturally, with a composed protective presence and clear measured delivery. Do not imitate an actor or fictional performance.'},
}
PREVIEWS = {
    'atlas': "I'm Atlas. Welcome to STAARWARDD. You set the direction; I'll keep an eye on the details. Kaia and I share the same capabilities, with our own approach. Choose a world and let's begin. This is an AI voice preview.",
    'kaia': "I'm Kaia. Welcome to STAARWARDD. Come in, get comfortable, and let's make room for what matters to you. Atlas and I share the same capabilities, with our own approach. This is an AI voice preview.",
}

async def synthesize(text, companion, client_factory=None):
    key = os.environ.get('OPENAI_API_KEY', '').strip()
    if not key:
        raise HTTPException(503, 'companion_voice_not_configured')
    if companion not in PROFILES or not text.strip() or len(text) > 2000:
        raise HTTPException(422, 'invalid_companion_speech')
    factory = client_factory or (lambda: httpx.AsyncClient(timeout=30, follow_redirects=False))
    try:
        async with factory() as client:
            response = await client.post('https://api.openai.com/v1/audio/speech',
                headers={'Authorization': 'Bearer ' + key},
                json={'model': MODEL, 'input': text, 'response_format': 'mp3', **PROFILES[companion]})
        if response.status_code != 200 or not response.headers.get('content-type', '').startswith('audio/') or not response.content:
            raise HTTPException(502, 'companion_voice_unavailable')
        return response.content
    except httpx.HTTPError:
        raise HTTPException(502, 'companion_voice_unavailable') from None
