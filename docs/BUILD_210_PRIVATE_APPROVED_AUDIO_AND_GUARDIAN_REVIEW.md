# Build 210 — Exact private music staged; recovered Guardian likeness still review-only

**Date:** 2026-11-16

## Verified EXACT approved native soundtrack
- Source: user-owned Library `Starward Guardian(2).m4a`, Opus 48 kHz, 2-channel, 206 seconds, 3,329,124 bytes.
- Source SHA-256: `2b8590fcae07a81e96fad7f6cb4769b02ef6eb0856ee9831ee0eb68c0e1a9938`.
- Native AAC: `Starward_Guardian_Approved_AAC_iOS.m4a`, 6,743,732 bytes, SHA-256 `ddd63b3622dd7524af8d976d53d7c0afce7cd35a4af1f7c3ce88ba61afadb937`.
- Original preserved byte-for-byte. AAC reproduced with `ffmpeg -map 0:a:0 -c:a aac -b:a 256k -ar 48000 -ac 2 -movflags +faststart` and separately checked byte-for-byte against user's **actual archived Build 195 AAC**.
- Files and generated native Metro alias are packaged in `STAARWAARDD_Build209_Exact_Approved_Soundtrack_Private_Staging.zip` and saved under user Library `/Projects/STAARWAARDD/STAAR Hub/Private Release Staging/`. No audio is in this public GitHub commit.
- The private package's independent Python/FFprobe verifiers and Build 206 quarantined 11-GLB source checker passed.
- **Boundary:** the authorized Expo checkout was not available to the local container, so the private kit is NOT proof the audio is uploaded to EAS or included in an IPA. Installer instructions invoke the repository's existing `stage-approved-startup-audio.mjs` and `prepare-private-eas-archive.mjs`.

## Actual Build 201 Guardian GLB rediscovered
- User-owned Library `STAARWAARDD_Build201_Collision_And_Guardian_Review.zip` contains `guardian-build201-distinct-16viseme-likeness-review.glb` with SHA-256 `e6e81a37cbc142c4d82fe8aff53adce3fb39b18f364aac18b599dccb4a80b8a1` (4,862,956 bytes).
- Independent re-read of actual GLB BIN yielded 10,285 head vertices, 14 nonempty speaking morph targets and max absolute cosine **0.9868578**, below the 0.9999 structural limit.
- Historical Build 201 owner review expressly did NOT approve true nose/jaw/ear profile, final facial likeness or real phoneme timing. Build 202 rejected its new test GLB as visually unfaithful.
- Build 202 founder approval record states `three_d_face_approved: false`, although three-view cinematic **2D references** were approved.
- Private ZIP `STAARWAARDD_Build210_Private_Guardian_Likeness_Review_Quarantined.zip` includes the exact 201 source GLB, authentic Build 201 QA, approved 202 reference stills, independent validator, QA contact sheet and historical regeneration source. It is saved in the same user Library private staging folder under an explicit **review-only** filename. Not in this GitHub repo; it must NOT be renamed to the production `guardian-armored-rig.glb`.
- Build 210 now blocks both older source SHA hashes at import and runtime in addition to the known rejected Build 202 and QA-only Build 208 models. Boolean approval flags cannot override their rejection.

## Release status
- **Approved original music bytes:** VERIFIED AND PACKAGED PRIVATELY.
- **Genuinely final, likeness-approved 3D GLB:** NOT AVAILABLE/NOT PASSED. Actual true-bilateral headturn, new geometry and independent owner identity review required.
- **Full App release:** NO-GO; actual owner-controlled EAS checkout, ten 3D worlds' rights/physics/device evidence, live provider/security control readback and Apple signature are not verified.
- **No paid credits or external cash:** CAD $0 new direct spending.
