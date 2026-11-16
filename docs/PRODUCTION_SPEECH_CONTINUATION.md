# Production speech integration continuation

Owner: STAARWAARDD application implementation.
Completion task: bring the missing direct narration transport into the current release line and expose local, account-bound mouth timing for existing speech.

Base: `continuation/guardian-audio-alignment` / PR 100, stacked on PR 99. This continuation preserves all newer Build 150–160 changes; it does not merge the older world-geometry branch over them.

## Delivered behaviour

- Existing Guardian narration selects direct OpenAI speech when the backend has `OPENAI_API_KEY`, preserving `tts-1`, Onyx and MP3. Provider errors do not cause an automatic second provider call. The legacy relay remains selectable explicitly for compatibility.
- `POST /api/guardian/speech-alignment/{key}` processes only existing cached speech. It requires an active account. Private clips require that account's ownership and unexpired cache entry; public fixed narration must have its canonical content key. It makes no new paid voice-generation request and accepts no arbitrary upload or executable path.
- The runtime invokes administrator-configured FFmpeg and Rhubarb locally. It uses private temporary audio, 10/25-second process limits, explicit arguments without a shell, two concurrent jobs maximum per worker, duplicate-job rejection and cached audio-bound results. Request cancellation kills the child and removes temporary audio. Server workers each have their own two-job limit; size deployment capacity accordingly.
- Session authorization, clip expiry and audio SHA-256 are checked again before private results are returned or cached. Responses are private/no-store. No result approves a face, installs a model or changes startup-film bytes.

## Backend configuration

Use backend secrets/configuration only:

```text
OPENAI_API_KEY=<existing backend secret>
GUARDIAN_SPEECH_PROVIDER=openai
GUARDIAN_RHUBARB_BINARY=/absolute/executable/path/to/rhubarb
GUARDIAN_FFMPEG_BINARY=/absolute/executable/path/to/ffmpeg
```

The executables must exist on the backend host, including Rhubarb's official data files. Missing configuration returns `503 speech_alignment_not_configured`. Voice playback remains independent of alignment availability. This local continuation does not install binaries or secrets on the live host.

The frontend importer from PR 100 binds cues to independently verified playback audio. Wiring a renderer to this endpoint still requires the identity-approved facial rig and actual audio-clock validation. The existing Guardian films are not altered to pretend that a facial rig exists.

## Evidence and remaining gates

The broad backend regression run passed 452 tests plus 6 subtests before the last two route regression cases; those two additional cancellation/revocation cases then passed in the 13-case route suite. All 70 frontend Node tests passed. Actual local runtime processing with Rhubarb 1.14.0/PocketSphinx produced 69 cues for its distributed 14.37-second speech fixture, ending neutral. No private user audio was used for this fixture and no provider credits were spent.

No approved GLB/GLTF/Blender/FBX/USDZ Guardian or final environment models exist in the checked-out frontend. The locked stills and startup film remain the reference masters. Final facial/model and nine-world visual acceptance, deployment configuration, genuine provider/device readback and signed native release remain open. The last observed earlier unsigned simulator compile passed, which is not a signed IPA or current-branch native acceptance.
