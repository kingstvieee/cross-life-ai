import asyncio
import os
import unittest
from unittest.mock import patch
import httpx
from fastapi import HTTPException
from companion_speech import synthesize

class CompanionSpeechTests(unittest.TestCase):
    def test_missing_key_never_dispatches(self):
        with patch.dict(os.environ, {'OPENAI_API_KEY': ''}):
            with self.assertRaises(HTTPException) as error:
                asyncio.run(synthesize('Hello', 'atlas'))
        self.assertEqual(error.exception.status_code, 503)

    def test_original_persona_delivery_and_binary_audio(self):
        captured = []
        def handle(request):
            import json
            captured.append(json.loads(request.content))
            return httpx.Response(200, headers={'content-type': 'audio/mpeg'}, content=b'ID3test')
        factory = lambda: httpx.AsyncClient(transport=httpx.MockTransport(handle))
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'test-only'}):
            for persona in ['atlas', 'kaia']:
                self.assertEqual(asyncio.run(synthesize('Hello', persona, factory)), b'ID3test')
        self.assertNotEqual(captured[0]['voice'], captured[1]['voice'])
        self.assertIn('British', captured[0]['instructions'])
        self.assertIn('warm', captured[1]['instructions'])
        self.assertTrue(all(row['response_format'] == 'mp3' for row in captured))

    def test_invalid_or_failed_audio_is_not_returned(self):
        factory = lambda: httpx.AsyncClient(transport=httpx.MockTransport(lambda request: httpx.Response(200, json={'error':'not audio'})))
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'test-only'}):
            with self.assertRaises(HTTPException) as error:
                asyncio.run(synthesize('Hello', 'atlas', factory))
        self.assertEqual(error.exception.status_code, 502)

    def test_unbounded_speech_and_unknown_persona_are_rejected(self):
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'test-only'}):
            for text, persona in [('x' * 2001, 'atlas'), ('hello', 'unknown'), ('  ', 'kaia')]:
                with self.assertRaises(HTTPException) as error:
                    asyncio.run(synthesize(text, persona))
                self.assertEqual(error.exception.status_code, 422)
