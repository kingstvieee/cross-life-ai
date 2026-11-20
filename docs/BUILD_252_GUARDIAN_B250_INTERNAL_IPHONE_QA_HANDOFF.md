# STAAR HUB Guardian — Build 252 exact private iPhone QA integration

**Owner direction:** Proceed after acceptance of the exact Build 250 Cinematic Chrome visual candidate and build 109 configuration, 20 November 2026, Toronto.

## What is implemented

- The owner's actual **12,646,332-byte** B250 articulated, 16-morph, 11-animation cinematic Guardian GLB is now an **internal physical-iPhone QA input**. Its loader verifies SHA-256 `057099cac71e04d6e1282b23fb52c9d593b8c1a4e055309254ca1f5609a42134`, GLB structure, neck-parented head and 16 named face targets.
- To load the QA model, build-time state must be **all four** `EAS_BUILD_PROFILE=preview`, `STAAR_IPHONE_ONLY_QA=1`, `EXPO_PUBLIC_GUARDIAN_DEVICE_QA=1`, `EXPO_PUBLIC_WORLD_COLLISION_QA=1`.
- The app's actual offline Three.js/WKWebView scene renders the QA model behind those guards, allows actual walk/run/head and local time-bounded face/jaw observations, and labels the scene **PRIVATE IPHONE QA / NOT RELEASED**.
- Production still uses the existing founder-accepted, independently receipt-validated Guardian loader. The SHA-block for B250 remains enforced for production and native activation.
- Any production build with the **private B250 staged file** fails early; the preview workflow fails before any paid build if the exact source is absent, wrong or lacks the approved AAC/locked film.
- Build-time QA embeds private GLB in generated WebView source **only inside a private preview build**, never as a public/static production asset; the GLB staging directory is Git-ignored.

## Exact private owner-controlled staging package

Library:
`/Projects/STAARWAARDD/STAAR Hub/Private Release Staging/STAARWAARDD_Guardian_B252_Internal_iPhone_QA_Handoff.zip`.

Includes actual GLB bytes at
`frontend/scene-src/assets/private-guardian-qa/guardian-b250-iphone-qa.glb`,
approved AAC at
`frontend/assets/audio/Starward_Guardian_Approved_AAC_iOS.m4a`,
and the verified React Native AAC import module. The exact original startup film is not replaced; the source checkout must already have it at
`frontend/assets/videos/guardian-startup.mp4`, SHA256 `1c8dce7f7b5f18e9ae580ec14910a0e20939cb8b52ec43897a08d2ecaa98886c`.

## Private owner QA flow (never use production profile)

In an **owner-controlled, clean Git checkout** of main after this integration:

1. Unzip the approved B252 private package at the repository root (the exact files are not added to Git).
2. Confirm the protected source film is already present.
3. Run `node frontend/scripts/stage-private-guardian-b250-qa.mjs` (no argument verifies staged GLB).
4. Run `node frontend/scripts/prepare-private-b250-qa-archive.mjs prepare` to check exact GLB, locked AAC module, film and generated EAS include rules.
5. Run `eas build:inspect --platform ios --profile preview --stage archive --output <fresh-private-dir>`, then
`node frontend/scripts/prepare-private-b250-qa-archive.mjs inspect <fresh-private-dir>`.
6. Before **any** paid EAS preview build, independently check actual quota, registered device provisioning, source commit, physical QA testing availability and costs. Never invoke production EAS, submit or TestFlight from this private review.
7. Use physical iPhone to record 300+ renderer frames, 60+ actual Walk, 60+ Run, 16+ neck poses, real speech/16 visemes, full face and armor visual QA. Upload/share the exported **scalar QA report** only with owner consent; no biometric images uploaded by QA telemetry.

## Remaining stop conditions

This is **not a signed IPA or a completed device test**. Owner visual acceptance of this exact candidate was recorded separately in `docs/BUILD_250_251_OWNER_ACCEPTANCE_2026-11-20.md`. It does **not** certify physical device motion/speech or clear **ten independently approved 3D world masters, collisions, provenance and rights, live provider OAuth readback, StarCenttinel independent security, approved EAS archive contents, Apple signature and TestFlight acceptance**. Each remains a fail-closed requirement.

**Spent:** CAD $0 incremental; Expo credits used: 0; no new Apple submission; production film and soundtrack unchanged.
