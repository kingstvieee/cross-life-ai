"""Offline mouth-cue alignment. Never sends speech to another service.

Rhubarb's nine audio-derived mouth shapes are approximate articulation, not
phoneme transcripts or proof of approved Guardian identity.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import tempfile

SHAPES = {'A': 'PP', 'B': 'kk', 'C': 'E', 'D': 'aa', 'E': 'O',
          'F': 'U', 'G': 'FF', 'H': 'TH', 'X': 'rest'}


def finite_number(value):
    return isinstance(value, (float, int)) and not isinstance(value, bool) and math.isfinite(value)


def convert_alignment(document, audio_sha256):
    """Bind measured intervals to the exact playback audio, neutralize gaps."""
    if not isinstance(audio_sha256, str) or len(audio_sha256) != 64 or any(c not in '0123456789abcdef' for c in audio_sha256):
        raise ValueError('invalid_audio_hash')
    if not isinstance(document, dict) or not isinstance(document.get('metadata'), dict):
        raise ValueError('invalid_alignment')
    duration = document['metadata'].get('duration')
    if not finite_number(duration) or not 0 < duration <= 240:
        raise ValueError('invalid_audio_duration')
    duration_ms = round(duration * 1000)
    if duration_ms <= 0:
        raise ValueError('invalid_audio_duration')
    rows = document.get('mouthCues')
    if not isinstance(rows, list) or len(rows) > 12000:
        raise ValueError('invalid_mouth_cues')
    # Integer milliseconds match the native playback clock. A dict coalesces
    # adjacent end/start events; a new shape wins at a shared boundary.
    events = {0: {'atMs': 0, 'viseme': 'rest', 'weight': 0}}
    previous_end = 0
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError('invalid_mouth_cue')
        start, end, shape = row.get('start'), row.get('end'), row.get('value')
        if (not finite_number(start) or not finite_number(end) or
                start < previous_end or end <= start or end > duration or
                not isinstance(shape, str) or shape not in SHAPES):
            raise ValueError('invalid_mouth_interval')
        a, b = round(start * 1000), round(end * 1000)
        if b <= a:
            raise ValueError('mouth_interval_too_short')
        viseme = SHAPES[shape]
        events[a] = {'atMs': a, 'viseme': viseme, 'weight': 0 if viseme == 'rest' else 1}
        events[b] = {'atMs': b, 'viseme': 'rest', 'weight': 0}
        previous_end = end
    if len(events) > 12000:
        raise ValueError('alignment_too_large')
    return {'schema': 'staar-guardian-alignment-v1', 'audioSha256': audio_sha256,
            'durationMs': duration_ms, 'source': 'rhubarb-audio-mouth-shapes',
            'identityApproved': False, 'cues': [events[t] for t in sorted(events)]}


def align_audio(audio_path, rhubarb='rhubarb', ffmpeg='ffmpeg', recognizer='pocketSphinx'):
    """Run trusted local executables with bounded duration and no shell."""
    if recognizer not in ('pocketSphinx', 'phonetic'):
        raise ValueError('invalid_recognizer')
    audio_path = Path(audio_path).resolve(strict=True)
    if not audio_path.is_file() or not 0 < audio_path.stat().st_size <= 32 * 1024 * 1024:
        raise ValueError('invalid_audio_file')
    data = audio_path.read_bytes()
    with tempfile.TemporaryDirectory(prefix='guardian-alignment-') as tmp:
        wav = Path(tmp) / 'speech.wav'
        subprocess.run([ffmpeg, '-nostdin', '-v', 'error', '-i', str(audio_path),
                        '-vn', '-ac', '1', '-ar', '16000', '-t', '241', str(wav)],
                       check=True, capture_output=True, timeout=45)
        result = subprocess.run([rhubarb, '-f', 'json', '--recognizer', recognizer,
                                 '--extendedShapes', 'GHX', str(wav)],
                                check=True, capture_output=True, timeout=120)
        if len(result.stdout) > 2 * 1024 * 1024:
            raise ValueError('alignment_too_large')
        return convert_alignment(json.loads(result.stdout), hashlib.sha256(data).hexdigest())


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('audio', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--rhubarb', default='rhubarb')
    parser.add_argument('--recognizer', choices=['pocketSphinx', 'phonetic'], default='pocketSphinx')
    args = parser.parse_args()
    result = align_audio(args.audio, args.rhubarb, recognizer=args.recognizer)
    # Never overwrite the input audio or any approved visual master.
    with args.output.open('x', encoding='utf-8') as destination:
        json.dump(result, destination, indent=2)
        destination.write('\n')
