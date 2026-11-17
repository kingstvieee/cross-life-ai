# STAARWAARDD Builds 236–237 — Guardian body transitions and 10-world ground acceptance

**Date:** 2026-11-17 Toronto. **Release:** NO-GO, pending actual physical device/rights/owner evidence. **Incremental paid generation:** CAD $0.

## Build 236: real private Guardian transition GLB and code

Source is Build 234 exact GLB, SHA-256 `2ae8eda577a5f60a0c82bb73d04be8280065acba9083b7c4d480e572cb0a58b8`. New derived binary `Guardian_Build236_WalkRun_Transitions_Review_ONLY.glb`: **10,738,796 bytes**, SHA-256 `283a1d5175c59f07f68373feb81ba417f9ea689de21f41ef0abdeb182fa0cec8`.

- Preserves exactly the first 4,735,136 source facial BIN bytes (SHA `ee78ab8bc97a7cad9853c878ace2d11d528ca9f4f981a0d5aff75ac8fc89c03d`), the founder-approved Build 228 face identity, all 16 morph targets, three original face animation clips and original geometry/skins.
- Two previous actual in-place clips remain: `WALK_IN_PLACE_BODY_QA` and `RUN_IN_PLACE_BODY_QA` (65 samples and 13 body tracks apiece).
- **Four added animations**, each 21 authored keyframes and 13 body-only tracks: `BUILD236_WALK_START_BODY_QA` (0.32s), `BUILD236_WALK_STOP_BODY_QA` (0.35s), `BUILD236_RUN_START_BODY_QA` (0.22s), and `BUILD236_RUN_STOP_BODY_QA` (0.28s). Source-to-transition endpoints, quaternion normalization, original animations and model byte preservation are independently checked.
- `guardian-locomotion.js` offers stop/start/loop switching and direct walk-to-run crossfades, rejects head, jaw, tongue, lip, morph and unrecognized tracks, and is instantiated **only** after the existing approved Guardian model loader accepts a release-qualified GLB. Explicit opt-in QA messages are session-bound. The Build 236 SHA remains unconditionally quarantined.
- **What remains unverified:** quality of natural human motion by an artist, 3D knee/shoulder/elbow self-collision, actual audio-bound facial synchronization during body animation, in-world character root translation, actual production Apple/iPhone playback, and rights/owner full-body acceptance. The private model is not installed.

## Build 237: ten exact floor-candidate GLBs and fail-closed on-device QA harness

- Based on ten exact Build 235 GLBs. Each has a named `Walkable unified floor slab`, but in their prior source all 10 slab nodes are tagged `visual_only`. The independently evaluated floor ray/triangle intersection along the entire revised capsule-clear route found **10/10 geometric sample coverage**, common floor elevation **−0.14m** (source coordinates). This is **not** ten approved physics surfaces.
- Ten newly generated private GLBs retain the **entire original BIN/geometry bytes unchanged**, modifying only glTF metadata to label the floor `walkable_candidate`. The candidate tag is intentionally **not** the runtime's accepted `walkable` authority. Their 10 new SHA fingerprints are stored in `world-review-only-shas.mjs` and refused even when approval flags are forged.
- `player-ground-support.js` performs exact per-triangle local support queries with slope bounds, ground gap checks, capsule footprint probes, height discontinuity protection and full-route sampling. **Only** accepted models with explicit `walkable` role pass; visually tagged or candidate-only floors fail closed. `worlds.js` enforces this on spawn, every route sample and every movement step in addition to the existing transformed triangle obstacle sweeps.
- Opt-in native QA instrumentation (`EXPO_PUBLIC_WORLD_COLLISION_QA=1`) captures actual scene frame intervals, walk/run steps, collision blockers, floor triangles and context losses for **one specific scene session**; user must explicitly tap Capture and Export. No video, identity, location, microphone or credentials are sent to external endpoints. The report remains marked `UNVERIFIED`; device attestation, actual captured iPhone test and founder signature are separate.
- **What remains unverified:** signed production world assets, actual portal spawn/exit coordinates, physics engine/gravity and dynamic collisions, stairs/level changes, ten separate physical iPhone walkthroughs, memory/thermal/fps, independent rights evidence and founder final acceptance. A 10/10 offline route and 10/10 geometric floor coverage are **not** 10/10 native physics certification.

## Private owners' archives
1. `/Projects/STAARWAARDD/STAAR Hub/Private Release Staging/STAARWAARDD_Build236_Private_Guardian_Transitions_NOT_RELEASE_APPROVED.zip`
2. `/Projects/STAARWAARDD/STAAR Hub/Private Release Staging/STAARWAARDD_Build237_TenWorld_FloorPhysics_Candidates_NOT_RELEASE_APPROVED.zip`

No private GLB, facial source, startup media or soundtrack may be pushed to public GitHub. The application and Apple release remain **NO-GO** until genuine hardware acceptance, independent StarCenttinel security readback, authenticated providers, approved EAS archive and signed IPA/TestFlight receipts. Successful GitHub checks cannot certify these requirements.
