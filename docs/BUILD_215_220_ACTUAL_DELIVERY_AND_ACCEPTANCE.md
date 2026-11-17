# STAARWAARDD Builds 215–220 — Actual production engineering handoff

**Recorded:** 2026-11-16 (Toronto local). **Release branch:** `release/build-215-220-runtime-and-release-gates`. **Direct additional external cash:** CAD $0.

## Build 215 — 3D navigation runtime
- Added bounded, swept circle-footprint / upright-cylinder collision testing, collision response and wall sliding. Rejects invalid geometry and excessive steps.
- Integrated keyboard WASD / arrows, pointer touch directional controls, camera-follow marker, scene cleanup, fallback accessible navigation and locked asset checks in the offline 3D WebView scene.
- Collision authority is only `staarCollisionRole:solid` on a GLB that passed the existing asset importer. Geometry labels alone are not approval.
- Detects explicitly authored Z-up world metadata before aligning authored XY routes to viewer XZ.
- Added deterministic tests. **Not yet physical-device-verified.**

## Build 216 — Six mobile collision proxy sidecars
- Created **six** real private low-LOD/collision proxy pairs from actual recovered GLB model geometry: home, work, wellbeing, relationships (realm), style and Staarsonic.
- Derived **692** candidate solid AABB proxies from node transforms and vertex bounds, preserved original model files.
- Exact private archive `STAARWAARDD_Build216_Six_Mobile_LODs_and_Collision_Proxies_PRIVATE.zip`, archived in owner Library `/Projects/STAARWAARDD/STAAR Hub/Private Release Staging/`. The archive is NOT in public GitHub.
- Added import-time separate proxy SHA-256 + source LOD binding and fails closed if proxy absent/invalid; explicit hash exclusion of all six review-only proxies from production.
- Three.js viewer loads an independently passed sidecar only for approved mobile world GLB; otherwise walking stays unavailable. Additional geometry/rendering verification and live device QA are separate.
- **Review assets are deliberately not final owner-approved, rights-verified or iPhone-tested.**

## Build 217 — Guardian 16-viseme facial controller
- Added 16 named morph controller, true clip-playhead timing, exact verified GLB/audio SHA and approved alignment requirement, muted idle and pause/visibility/disposal resets.
- Wired solely to the validated approved model loader; never changes the original locked silver/gold Guardian or substitutes the rejected 198/201/202/208 faces.
- **No final owner-by-hash approved, identity-corrected GLB, speech alignment for that binary, or physical device mouth-sync proof exists in staging.** Therefore owner-approved creative facial appearance cannot be equated with a completed 3D production actor.

## Build 218 — StarCenttinel safety-readiness contract
- Deployed independent control plane inspected under Supabase `khpprzhqovzhgxdltarq`, edge function `sentinel-control`, gateway JWT verified.
- Actual data readback: `LOCKDOWN`, revision **0**, `external_authority_verified=false`, deny-only Edge Function.
- Backend now has authenticated `GET /api/guardian/core/safety-readiness` that independently challenges the pinned HTTPS endpoint, requires nonce-bound HMAC proof and fresh WebAuthn/provider revocation/nine-portal claims, and **fails closed** for unsigned/stale/LOCKDOWN states.
- Tests with mock signed server prove admission rules; they are NOT substitutes for actual WebAuthn enrollment, real provider credential revocation, independent owner recovery, and 9 portal enforcement.

## Build 219 — Signed security and private EAS preflight
- Release preflight now requires a fresh, HMAC-verified, privately supplied, Guardian-GLB-SHA-bound independent StarCenttinel enforcing proof, in addition to existing ten-world independent rights/owner/device evidence and native exact approved AAC upload rules.
- No attestation has been fabricated; the real deployed service cannot issue an enforcing proof while in LOCKDOWN.
- The exact approved `Starward Guardian(2).m4a` and iOS AAC are separately hash-verified/private; nothing is committed to the public repo.
- Need actual owner-controlled `eas build:inspect` archive verification and private signing session before EAS production dispatch.

## Build 220 — 11 hard release requirements / macOS IPA signature verification
- Extended signed-release readiness from 8 to **11** independent evidence gates: original film, 11 visual hashes, nine named worlds with ten GLBs, approved Guardian rig/lip sync, real provider readback, actual iPhone/Watch testing, signed native IPA, ten-world collision proof, independent StarCenttinel revocation/recovery, actual inspected EAS archive, founder acceptance of TestFlight.
- Added trusted macOS `verify-build220-ipa.sh` for codesign, correct Apple team `R9BPDSU4BW`, bundle `com.emergent.crosslifeai.z79271`, version `1.0.4`, build `106`, and IPA SHA-256.
- Existing EAS workflow remains human/founder gated: preflight → production iOS build → founder approval → TestFlight.
- No Expo authenticated browser connection was found, no final approved face GLB/rights/device evidence has arrived, no signed IPA was generated and no TestFlight submission was attempted. Configured iOS 106 does not imply installed 106; last user-reported TestFlight showed 105.

## Definitive acceptance
- All software changes subject to comprehensive GitHub CI; green checks prove code compilation/unit tests, **not** actual signed iPhone production acceptance.
- Production decision is **NO-GO** until real final-approved GLB-by-hash and ten world/device/rights receipts, real independent security recovery/revocation, actual EAS upload archive, Apple signing, TestFlight receipt and physical-device testing are all present.
- Do not change approval booleans to simulate receipts. Do not deploy a dangerous unrecoverable revocation system or expose any private model/audio/secret in GitHub.

**Direct added external spend:** CAD $0. No new paid credits/subscriptions or Apple/TestFlight actions executed by these code changes.
