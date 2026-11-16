# STAARWAARDD Build 193 — recovered locked music and authentic face reference provenance

## Recovered from owner's Library, verified against actual bytes
**Original approved soundtrack**: `Starward Guardian(2).m4a`, 3,329,124 bytes, SHA-256 `2b8590fcae07a81e96fad7f6cb4769b02ef6eb0856ee9831ee0eb68c0e1a9938`. It is a 206.0-second 48 kHz stereo **Opus** track in an MP4/M4A container, not an AAC file. The original file remains completely unmodified in the private staging package and in the owner's Library.

**Native AAC derivative**: `Starward_Guardian_Approved_AAC_iOS.m4a`, 6,743,732 bytes, 48 kHz stereo AAC, 206.013 seconds due to codec priming/container timing, SHA-256 `ddd63b3622dd7524af8d976d53d7c0afce7cd35a4af1f7c3ce88ba61afadb937`. Converted with `ffmpeg -i ORIGINAL -map 0:a:0 -vn -sn -dn -c:a aac -b:a 256k -ar 48000 -ac 2 -movflags +faststart OUTPUT`. This is a lossy compatibility derivative, not a bit-identical master. **No iPhone playback or mute interaction has been verified.**

The binary AAC derivative is in a private conversation delivery package. It is not in the GitHub source repository; neither a public download nor an automatic audio swap has been deployed. The Build 193 `verify-approved-soundtrack.mjs` adds a fail-closed **signed-release preflight**: `frontend/assets/audio/Starward_Guardian_Approved_AAC_iOS.m4a` must exist, match the exact 6,743,732 bytes and SHA-256, and be an MP4-family file. The app runtime must separately be wired to play this file and device-tested before TestFlight. Do not interpret passing tests as audio playback.

## Archived live video references
The user's archived video files `6055039F-0743-49BA-BA09-D265783627FC.mp4` and `ips-DE38A552-F718-4319-AF4A-AABC0F132921.mp4` were recovered and inspected. Five source-timestamped PNG frames were extracted. Their complete cryptographic hashes and source-video SHA-256s are recorded in `frontend/scene-src/build193-recovered-media.json` and the private frame package.

These are authentic archived selfie-style source materials, not generated Guardian portraits. Their phone angles, filters and camera motion make them **uncalibrated reference candidates** only. They do **not** provide controlled 90-degree bilateral profiles, neutral lighting or sufficient photogrammetric coverage. Do not claim 3D facial reconstruction or identity attestation from these alone. The original user photographs `IMG_5711.jpeg` and foreground person in `IMG_4824.jpeg` remain the designated actual identity references.

## Preserved approval separation
- Three Build 189 portraits: founder-approved **cinematic visual direction**.
- Build 190/191 GLBs: structural technical studies, not likeness-approved.
- Build 193 recovered audio: exact source recovered, native AAC derivative prepared but not deployed.
- Ten worlds, final head model, 16 actual viseme sync, real-device evidence, Apple signing and TestFlight: still gated.

## Zero-spend and privacy
No additional money or paid credits consumed (CAD $0). The GitHub branch includes hashes, test logic and review metadata only — no private audio binaries, selfies or extracted face frames.
