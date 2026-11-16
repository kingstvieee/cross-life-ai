# Build 204 — Guardian facial deformation must be real, distinct mesh data

**Owner direction (November 16, 2026):** “I accept final guardian facial finish all I completes and builds.” This is authorization to advance completion of the approved final Guardian facial direction; it is not evidence that the rejected Build 202 GLB changed or that an uninspected binary now passes human likeness review.

## What changed
- `frontend/scene-src/guardian-morph-qa.mjs` reads embedded GLB BIN contents, resolves glTF accessor and buffer-view offsets, and checks the fourteen speaking shapes among the locked sixteen target names.
- Rejects sparse/unsupported or out-of-range VEC3 accessors, non-finite/extreme displacements, zero-motion speech shapes, reused accessors and almost identical speaking deformation vectors (absolute cosine ≥ 0.9999).
- Retains `rest` and `sil` as permitted neutral poses.
- Runs inside the production Guardian importer and surfaces a numeric `morphQa` measurement. It cannot be bypassed by an approval boolean.
- Tests now construct genuine embedded binary displacement fixtures; regressions cover duplicate and silent shapes.
- Build 203 SHA-256 rejection of the previously failed model continues to apply.

## Acceptance boundary
**Verified by automated code:** bounded 16-target structural mesh parsing, fourteen nonempty/distinct speaking morphs, consistent source fingerprints and independent approval receipt gates.

**Not verified by automated code:** accurate likeness to the user's real front/three-quarter/profile face, UV/artifact-free textures and silver-gold crest, natural 16-phoneme lip synchronization to approved speech, real bilateral head scan, Apple signature, native device performance and signed production release.

**Release decision:** Continue building and testing; hold production rig installation until a new precise model hash and actual owner/device evidence satisfy every release criterion. Never approve the rejected Build 202 GLB just because its creative portrait is approved.

**Spend:** CAD $0. No paid modeling or video credits authorized by this code change.
