# STAARWAARDD Builds 213–214 — Real ten-world offline collider candidates

**Verified date:** November 16, 2026. **Spend:** CAD $0. **Status:** 10 original/corrected, privately staged **review-only** GLB candidates, not a signed or production-certified application.

## Actual work performed
- Recovered 10 real GLB world assets from archived user-owned Build 198 and Build 201 ZIPs and compared actual SHA-256 of their bytes against owner-recorded evidence.
- Build 213 staged 6 Build 201 collision-corrected GLBs and 4 original Build 198 GLBs in a single private ten-world package, alongside 6 mobile-review LODs whose collider sidecars are **still required**.
- Build 214 added explicit `staarCollisionRole` metadata and proposed route coordinates to the **four** previously untagged worlds: creativity-dream, relationships-singles, events-village and staarverse-universe. Their raw geometry, textures, animations and existing original files were not edited.
- Independently reloaded all ten candidate GLB binaries in an offline geometry test, computed 0.25 m occupancy paths with approximately 0.35 m capsule inflation, and sampled each path. Result: **10/10 offline connected route candidates**.
- Preserved original fixture endpoints in 9/10 worlds; **STARVERSE** needed an explicitly documented 0.25 m free-space adjustment to the requested test fixture start and end. This does not constitute a final game spawn design.
- Private archives saved in owner's ChatGPT Library folder `/Projects/STAARWAARDD/STAAR Hub/Private Release Staging/`:
  - `STAARWAARDD_Build213_Ten_Worlds_Private_Integration_Review.zip` — source review, 6 corrected / 4 original.
  - `STAARWAARDD_Build214_Ten_Collision_Tagged_Worlds_Private_QA.zip` — all 10 collider-role-tagged review candidates.
- Build 214 private archive SHA-256: `de2eb2f27e386bea0c4f5bc484f9490fd6cde814e727d310ee47c76ff00c91f3`.

## Explicitly unresolved
- Current native application 3D viewer is driven by Three.js `OrbitControls`; there is no proven integrated player-capsule collision controller consuming these `staarCollisionRole` tags. A geometric offline route does not establish actual app runtime collisions.
- Six mobile LODs from Build 201 still explicitly require collision-proxy sidecars.
- Ten real iPhone navigation and interaction sessions, actual world art approval, rights/license receipts, per-world independent device evidence, and signed IPA remain unverified.
- Guardian's owner-accepted *facial creative direction* is distinct from a final production GLB-by-hash acceptance; older Guardian binaries remain rejected. The exact approved music is in a private staging package and is not placed in public GitHub.

## Release protections installed
- Manifest pins all 10 review candidate SHA-256s, 6 legacy corrections and 4 raw originals, including explicit false engine/device/owner/rights completion.
- `approved-world-assets.mjs` now rejects those **10** exact review-only SHA-256 values even if an arbitrary receipt supplies positive-looking approval flags.
- CI tests require correct 10/10 variants, legitimate source-hash ties to Build 198 and Build 201, and a hard **NO-GO** for actual production/device certification.

**Next true engineering gate:** implement and instrument in-app player movement/collision from authored roles, then capture genuine per-world physical-device results and complete ten world approvals and rights documentation. Do not flip acceptance flags or build an IPA from review-only source.
