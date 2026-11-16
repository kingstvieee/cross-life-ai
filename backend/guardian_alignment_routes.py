"""Account-bound runtime alignment for existing cached speech only.

No new voice provider calls; no face generation; no uploaded arbitrary audio.
"""
import asyncio
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import JSONResponse
from guardian_alignment import convert_alignment


def usable_speech(doc, user_id, now):
    if not doc:
        raise HTTPException(404, 'speech_not_found')
    if doc.get('visibility') == 'private':
        if doc.get('private_user_id') != user_id:
            raise HTTPException(404, 'speech_not_found')
        expiry = doc.get('expires_at')
        if not isinstance(expiry, datetime):
            raise HTTPException(410, 'speech_expired')
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        if expiry <= now:
            raise HTTPException(410, 'speech_expired')
    elif doc.get('visibility') != 'public' or doc.get('content_key') != doc.get('key'):
        raise HTTPException(404, 'speech_not_found')
    audio = doc.get('audio')
    if not isinstance(audio, (bytes, bytearray)) or not 0 < len(audio) <= 32 * 1024 * 1024:
        raise HTTPException(422, 'invalid_speech_audio')
    return bytes(audio)


async def local_alignment(audio):
    # Administrator-owned binary paths; no executable/path is accepted from clients.
    rhubarb = os.environ.get('GUARDIAN_RHUBARB_BINARY', '')
    ffmpeg = os.environ.get('GUARDIAN_FFMPEG_BINARY', '')
    if not all(Path(p).is_absolute() and Path(p).is_file() and os.access(p, os.X_OK)
               for p in (rhubarb, ffmpeg)):
        raise HTTPException(503, 'speech_alignment_not_configured')

    async def execute(arguments, timeout):
        process = await asyncio.create_subprocess_exec(*arguments,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        try:
            stdout, _ = await asyncio.wait_for(process.communicate(), timeout)
            if process.returncode or len(stdout) > 2 * 1024 * 1024:
                raise ValueError('alignment_process_failed')
            return stdout
        finally:
            # A disconnected request must not free capacity while a child keeps
            # consuming CPU or retaining private speech in a temporary directory.
            if process.returncode is None:
                process.kill()
                await process.wait()
    try:
        with tempfile.TemporaryDirectory(prefix='guardian-runtime-mouth-') as tmp:
            path = Path(tmp) / 'speech.mp3'
            path.write_bytes(audio)
            wav = Path(tmp) / 'speech.wav'
            await execute([ffmpeg, '-nostdin', '-v', 'error', '-i', str(path),
                '-vn', '-ac', '1', '-ar', '16000', '-t', '241', str(wav)], 10)
            output = await execute([rhubarb, '-f', 'json', '--recognizer', 'pocketSphinx',
                '--extendedShapes', 'GHX', str(wav)], 25)
            return convert_alignment(json.loads(output), hashlib.sha256(audio).hexdigest())
    except TimeoutError:
        raise HTTPException(504, 'speech_alignment_timed_out') from None
    except (ValueError, OSError):
        raise HTTPException(502, 'speech_alignment_unavailable') from None


def build_alignment_router(db, require_user, rate_limit, runner=local_alignment, now=None):
    router = APIRouter()
    clock = now or (lambda: datetime.now(timezone.utc))
    active = set()

    @router.post('/guardian/speech-alignment/{key}')
    async def speech_alignment(key: str, authorization: str | None = Header(None)):
        user = await require_user(authorization)
        rate_limit(f"alignment:{user['user_id']}", 10, 60)
        if not re.fullmatch(r'[A-Za-z0-9_.-]{1,128}', key):
            raise HTTPException(404, 'speech_not_found')
        doc = await db.tts_cache.find_one({'key': key})
        audio = usable_speech(doc, user['user_id'], clock())
        digest = hashlib.sha256(audio).hexdigest()
        cached = doc.get('mouth_alignment')
        if isinstance(cached, dict) and cached.get('audioSha256') == digest:
            return JSONResponse(cached, headers={'Cache-Control': 'private, no-store'})
        # Reject overload, do not queue unbounded private audio or duplicate work.
        if key in active or len(active) >= 2:
            raise HTTPException(429, 'speech_alignment_busy', headers={'Retry-After': '2'})
        active.add(key)
        try:
            result = await runner(audio)
            if (not isinstance(result, dict) or result.get('audioSha256') != digest or
                    result.get('schema') != 'staar-guardian-alignment-v1' or
                    result.get('identityApproved') is not False):
                raise HTTPException(502, 'speech_alignment_mismatch')
            # Recheck account consent/session and clip expiry after CPU work.
            current_user = await require_user(authorization)
            if current_user['user_id'] != user['user_id']:
                raise HTTPException(401, 'account_changed')
            fresh = await db.tts_cache.find_one({'key': key})
            current = usable_speech(fresh, user['user_id'], clock())
            if hashlib.sha256(current).hexdigest() != digest:
                raise HTTPException(409, 'speech_audio_changed')
            await db.tts_cache.update_one({'key': key}, {'$set': {'mouth_alignment': result}})
            return JSONResponse(result, headers={'Cache-Control': 'private, no-store'})
        finally:
            active.discard(key)
    return router
