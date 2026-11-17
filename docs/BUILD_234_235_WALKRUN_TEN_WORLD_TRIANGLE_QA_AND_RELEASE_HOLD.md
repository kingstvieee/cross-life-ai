# STAARWAARDD Guardian Builds 234–235 — Walk/Run and 10-World Triangle Collision QA

**Recorded:** November 17, 2026 (Toronto). **Source:** user-owned private GLB archives and GitHub main commit `456debba036617bf9dbe7d52066d18fb0c43a131`. **Cost:** CAD $0 incremental paid credits. **Final release:** NO-GO.

## 1 — Build 234: actual walk/run animation GLB, private review only

- New real rig GLB: `Guardian_Build234_ChromeGold_WalkRun_Animation_QA_NOT_APPROVED.glb`, 10,708,008 bytes; SHA-256 `2ae8eda577a5f60a0c82bb73d04be8280065acba9083b7c4d480e572cb0a58b8`.
- Built from the actual private Build 233 body GLB while preserving its prior mesh/face binary, all **16 facial morph targets**, **3 original facial animation clips**, **16 skeletal body joints**, and the original approved Build 228 likeness source identity.
- The two new executable glTF clips are `WALK_IN_PLACE_BODY_QA` (1.35 s, 65 pose samples, 13 body tracks, simulated external root speed 1.65 m/s) and `RUN_IN_PLACE_BODY_QA` (0.88 s, 65 pose samples, 13 tracks, simulated external root speed 3.65 m/s). The tracks are in-place: real locomotion requires the live collision-controlled avatar root to move.
- A **separate** script reparsed the real new binary and recomputed joint forward kinematics over 65 frames per clip. Maximum sampled stance-foot slip: walk **0.000000297 m**, run **0.000000453 m**. Maximum swing-ankle elevation: walk ~0.115 m, run ~0.290 m. This is *mathematical rigging QA*, not an actor-observed natural-gait certification.
- **Not accepted:** artist-quality natural human movement, foot placement on stepped floors, kinetic secondary/cloth/armor motion, actual reactive character head/torso coupling, self-collisions, mouth timing, body playback and thermal/frame tests on physical iPhone.

## 2 — Build 235: ten real-world geometric collision candidates

- Opened private `STAARWAARDD_Build214_Ten_Collision_Tagged_Worlds_Private_QA.zip` to read the **real source GLB triangles** rather than only route register claims.
- Recomputed 10 original route fixtures against the full tagged-solid triangle height slab and 0.35 m radius. **Only six of the ten original triangle-swept routes cleared.** Previous 10/10 record used a weaker offline route representation; the new result is not a regression in installed gameplay.
- Four original crossings hit solid geometry: **home-residence**, **work-command**, **wellbeing-health**, **relationships-singles**.
- Corrected six route-metadata sets (four collision repair routes, plus two waypoint adjustments) while preserving each original world geometry binary. In the Singles candidate, the illustrative endpoint changes **0.75 m** to avoid the champagne bar. The Health candidate has a longer ~45.31 m detour that may require floor/portal-design revision.
- Verified **10/10 corrected candidate routes clear the exact tagged-triangle XY radius test** independently in Python and in JavaScript with a spatial-hash triangle index, approximately 0.08 m sweep resolution. There are no rights or owner acceptances for these *new* GLBs.
- The actual GLB triangles are indexed in the application scene in full transformed Three.js coordinates. Walk/run keyboard/touch controls use the same swept capsule, exact triangle collision predicate, and fail-closed route preflight. The prior broad AABB source remains available as a strict fallback only in developer tests; if the triangle index, role tags or route proof fail, free navigation is **disabled** rather than allowed through walls.
- **Not accepted:** true physical-floor traversability and gravity, multiple height levels, stairs, dynamic actors/doors, all portal endpoints, iPhone GPU/frame rates, thermal/memory performance, finished ten art environments or final rights.

## 3 — Private evidence and release isolation

Neither private GLB package is included in the **public GitHub source**. Original face and audio masters remain protected. The runtime and asset importers explicitly deny Build 234 SHA and all ten Build 235 SHA values even when forged approval booleans are supplied. Offline green checks **do not** override the final founder-approved production Guardian or physically certified world release.

Private archives:
1. `/Projects/STAARWAARDD/STAAR Hub/Private Release Staging/STAARWAARDD_Build234_Private_WalkRun_Animation_QA_NOT_APPROVED.zip`.
2. `/Projects/STAARWAARDD/STAAR Hub/Private Release Staging/STAARWAARDD_Build235_TenWorld_TriangleCollision_QA_NOT_APPROVED.zip`.

These ZIPs contain exact SHA-bearing new GLB binaries, reproducible authorship scripts, independent verifiers, detailed test outputs and the standalone geometry kernel.

## 4 — Remaining mandatory acceptance before native production release

**No actual physical iPhone pass is claimed here.** Owner-controlled internal device capture must demonstrate final accepted body rig and chrome/black finish reconciliation, *actual* motion/foot placements under native rendering, final 10 world traversals, real portal spawn/end positions, accurate 16-viseme audio-bound speech, reliable collisions and sustained performance. Then verify assets/licensing, live owner StarCenttinel recovery/revocation attestation and a real EAS inspected archive, Apple signed IPA and App Store Connect/TestFlight receipt. Current configured iOS version `1.0.4 (106)` is not an uploaded/signed build.

**Release verdict: NO-GO.** Source engineering and offline QA are complete for these two candidates; native device/animation/rights/Apple certification remains outstanding.
