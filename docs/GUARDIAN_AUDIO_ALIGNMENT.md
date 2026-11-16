# Local Guardian audio alignment

Owner: STAARWAARDD application implementation.
Completion task: derive bounded, audio-bound mouth cue sidecars from real recorded audio without paid generation or changing locked visual masters.

The previous 150–160 branch had a playback-state gate and cue validator but no way to produce measured mouth timings. `backend/guardian_alignment.py` adds a local FFmpeg → Rhubarb Lip Sync → validated sidecar pipeline. Install FFmpeg and the official Rhubarb release on the rendering host. Neither executable is bundled with the app. No server endpoint, recurring worker or automatic paid request is introduced.

```sh
python backend/guardian_alignment.py speech.mp3 speech.alignment.json --rhubarb /absolute/path/to/rhubarb
```

English uses Rhubarb's PocketSphinx recognizer. For other languages explicitly select `--recognizer phonetic`. Both produce approximate nine-shape articulation, not a phoneme transcript or guaranteed visual accuracy. Use isolated dry dialogue; music and background effects reduce accuracy. The startup film is not a clean dialogue recording and must remain unchanged.

The result contains the SHA-256 of the exact input playback bytes, duration in milliseconds, measured cues mapped to the existing Guardian viseme names, neutral cues at gaps and utterance ends, and `identityApproved: false`. Adjacent interval boundaries are coalesced. Invalid, overlapping, out-of-range, oversized and nonfinite data fail validation. Input is limited to 32 MiB and 240 seconds; processes use explicit arguments without a shell, private temporary files and finite deadlines. The command refuses to overwrite its output.

`parseGuardianAudioAlignment` accepts sidecars only against an independently verified playback SHA-256. It cannot approve a face or rig. Alignment generation is offline tooling; the live speech API still returns MP3 without automatic alignment, and no facial mesh is installed by this change. A production consumer must verify audio bytes, consume the real playback clock, and require the existing approved rig gate.

Validation: Python malformed-interval/silence/shape coverage; Node clip-hash, identity and playback tests; an actual Rhubarb 1.14.0 run on its distributed `riddle.wav` fixture passed through the Python converter and frontend parser. This is tooling evidence, not final Guardian visual acceptance.

Remaining: identity-approved morph-target rig; integrating and performance-testing alignment against live generated speech; nine accepted world assets; genuine native/provider/device readbacks; signed IPA. No completion or TestFlight acceptance is inferred from this tooling.
