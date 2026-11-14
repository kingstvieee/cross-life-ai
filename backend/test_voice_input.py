import base64
import os
import unittest
from unittest.mock import patch
import httpx
from fastapi import HTTPException
from voice_input import transcribe, MAX_AUDIO

class VoiceInputTests(unittest.IsolatedAsyncioTestCase):
    async def test_rejects_invalid_input_before_provider(self):
        for encoded, mime in [('YQ==', []), ('!', 'audio/mp4'), ('', 'audio/mp4'), ('YQ==', 'text/plain'), ('a' * (MAX_AUDIO * 2), 'audio/mp4')]:
            with self.assertRaises(HTTPException) as error:
                await transcribe(encoded, mime)
            self.assertEqual(error.exception.status_code, 422)
    async def test_requires_server_key(self):
        with patch.dict(os.environ, {'OPENAI_API_KEY': ''}):
            with self.assertRaises(HTTPException) as error:
                await transcribe('YQ==', 'audio/mp4')
            self.assertEqual(error.exception.status_code, 503)
    async def test_dispatch_and_readback(self):
        def handle(request):
            self.assertEqual(request.url.path, '/v1/audio/transcriptions')
            self.assertIn(b'gpt-4o-mini-transcribe', request.content)
            self.assertIn(b'recording.m4a', request.content)
            self.assertIn(b'fake-audio', request.content)
            return httpx.Response(200, json={'text': '  Hello Atlas  '})
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'test-only'}):
            result = await transcribe(base64.b64encode(b'fake-audio').decode(), 'audio/mp4', lambda: httpx.AsyncClient(transport=httpx.MockTransport(handle)))
        self.assertEqual(result, 'Hello Atlas')
    async def test_provider_failure_has_no_audio_or_key(self):
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'test-only'}):
            with self.assertRaises(HTTPException) as error:
                await transcribe('YQ==', 'audio/mp4', lambda: httpx.AsyncClient(transport=httpx.MockTransport(lambda _: httpx.Response(429))))
        self.assertEqual(error.exception.detail, 'transcription_unavailable')
if __name__ == '__main__': unittest.main()

class VoiceRouteTests(unittest.IsolatedAsyncioTestCase):
    def route(self, authenticate, limiter):
        import ast
        from pathlib import Path
        from typing import Optional
        from fastapi import Header, Request, Response
        source = ast.parse(Path(__file__).with_name('server.py').read_text())
        fn = next(n for n in source.body if isinstance(n, ast.AsyncFunctionDef) and n.name == 'companion_transcribe')
        fn.decorator_list = []
        env = dict(Optional=Optional, Header=Header, Request=Request, Response=Response, HTTPException=HTTPException, require_account_user=authenticate, rate_limit=limiter)
        exec(compile(ast.Module(body=[fn], type_ignores=[]), '<voice-route>', 'exec'), env)
        return env['companion_transcribe']
    async def test_authentication_precedes_reading_audio(self):
        async def reject(_): raise HTTPException(401, 'sign_in_required')
        class NeverRead:
            def stream(self): raise AssertionError('Unauthenticated body was read')
        with self.assertRaises(HTTPException) as error:
            await self.route(reject, lambda *args: None)(NeverRead(), None)
        self.assertEqual(error.exception.status_code, 401)
    async def test_stream_limit_enforced_without_content_length(self):
        async def account(_): return {'user_id': 'test-account'}
        class Oversized:
            async def stream(self):
                yield b'x' * (7 * 1024 * 1024)
                yield b'x'
        with self.assertRaises(HTTPException) as error:
            await self.route(account, lambda *args: None)(Oversized(), 'Bearer test')
        self.assertEqual(error.exception.status_code, 413)
    async def test_invalid_json_rejected(self):
        async def account(_): return {'user_id': 'test-account'}
        class Invalid:
            async def stream(self): yield b'not-json'
        with self.assertRaises(HTTPException) as error:
            await self.route(account, lambda *args: None)(Invalid(), 'Bearer test')
        self.assertEqual(error.exception.status_code, 422)
