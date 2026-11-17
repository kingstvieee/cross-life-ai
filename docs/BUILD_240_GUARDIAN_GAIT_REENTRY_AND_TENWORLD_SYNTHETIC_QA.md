# STAARWAARDD Build 240 — Guardian Locomotion Safety and Ten-World Synthetic Physics Matrix

**Scope:** Source-code animation safety corrections and synthetic 3D collision regression tests. **Not** a replacement 3D Guardian GLB, production natural-motion acceptance, native Bullet/Rapier collision proof, iPhone installation, or Apple signing.

## Reproduced Guardian defect and repair

The Build236 `createGuardianLocomotion` controller schedules an outgoing gait action to stop after a 130 ms fade-out. During a quick **walk → run → walk** sequence, it reused the previously outgoing Walk action but did not remove the earlier delayed stop. Once that timer elapsed, Three.js stopped the currently active Walk action while the public controller still reported `mode: walk`. Local reproduction: the upper-arm quaternion remained at **0 → 0** between two gait sample times even though the mode was Walk.

Build240 removes stale delayed-stop entries **before reactivating that same AnimationAction**, and deduplicates pending fade-out records. The same reproducer now shows distinct quaternion samples of approximately **0.184 → 0.274**. This is an animation-controller bug fix, **not** an observation of realistic feet, hands, facial resemblance or a physical iPhone.

## Complete bone-track validation

A purported gait clip could previously supply 13 tracks yet repeat the same `Pelvis.position` track 13 times, while `ready=true` incorrectly implied that every body limb was animated.

Build240 now requires:

- The 13 uniquely named Guardian body joints (pelvis, spine, chest, left/right upper arms, forearms, thighs, calves, and feet) each appear **exactly once** in the actor's skeleton.
- Every required animation clip has **exactly 13 distinct named tracks**.
- Pelvis is animated by `VectorKeyframeTrack` on `.position`; other joints use `QuaternionKeyframeTrack` on `.quaternion`; no head, jaw, tongue, mouth, viseme or facial channels are accepted.
- Finite values, strictly increasing keyframe times inside the clip duration, matching sample lengths and approximately normalized bone quaternions.
- The legacy `approvedAsset` and reduced-motion options remain fail-closed. **`approvedAsset` is never an independent receipt** and must still be supplied only by the existing asset-validation loader.

A malformed candidate results in `ready=false` and refuses playback. No new 3D asset becomes approved by these tests.

## Ten-world synthetic safety matrix

The new `build240-ten-world-synthetic-collision.test.mjs` enumerates the ten canonical world identities and uses **generated, synthetic** floors and tagged triangle walls to exercise shared runtime physics code.

It confirms, per identity:

- A clear corridor can be navigated through.
- A capsule blocks on a real triangle wall, even under repeated running-speed increments.
- A wall-crossing route is rejected, and a clear parallel route is allowed.
- An avatar near the outside floor edge is unsupported.
- Known private Build237 floor-model hashes remain quarantined.
- An artificial floor gap is not mistakenly treated as a continuous bridge.

This suite exercises common physics code against fixtures. It does **not** inspect ten actual final GLBs, prove hardware-accelerated native collision behavior, certify a real iPhone or confirm portal destinations.

## Local QA evidence

On Nov 17, 2026, the locally checked-out source, plus these Build240 corrections, passed:

- **36/36** focused Build235–240 tests spanning animation, collision, ground support and QA export validation.
- Build 106 **source-only** internal preview verification: `sourceReadyForOwnerBuildApproval=true` and no blockers.
- 3D runtime bundling: generated an offline runtime; local esbuild reported a missing `expo/tsconfig.base` warning because the full Expo installation was not present in the temporary workspace. CI remains authoritative for full dependency and native prebuild checks.

Do not infer that any physical-device test, artist approval or Apple signing occurred.

## Release separation and queued build

The existing internal iPhone QA workflow `01a1eaa3-ced2-71f2-a18f-ea070ab7766c` is **pinned to** `26d0f400860c86ae3616d0f890ac86516228d13b` and version `1.0.4 (106)`. That workflow remains in Expo's Free Tier queue and **does not include Build240 source changes**, whether or not this pull request merges.

**Do not cancel/restart the queued run merely for these improvements:** the current 106 preview can still be useful to learn signing/installation constraints. Independently record the exact signed binary's Git SHA, then schedule a later internal QA build containing Build240 after approval, with a unique Apple build number. Do not reuse an uploaded Apple build number or imply the two binaries are the same.

No Expo build, TestFlight submission, payments or production asset approvals were initiated by Build240.

## Remaining acceptance gates

- Founder-reviewable full-body walking and running video including contact, gait symmetry, arms, feet, armour clipping, and approved exact Build228 facial identity.
- Actual ten distinct immersive environments: geometry/rights receipts, correct world endpoints and walkable floors.
- True iPhone navigation QA: at least 300 renderer frames and repeated walk, run, wall and gap tests per world, frame interval p95 target ≤ 33.34 ms, explicit stall/error logs and device provenance.
- Signed internal IPA, correct provisioning for the registered iPhone, installation and independent device readback.
- TestFlight production submission stays separate and blocked until final production acceptance.

**No additional paid spend authorized (CAD $0).**
