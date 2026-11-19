# STAARWAARDD locked portal and GLB recovery — source curation (2026-11-19)

## Source inspected
Authenticated STAARWAARDD Drive folder `Guardian_REBUILT_40s_REVIEW_487_CREDITS_2026-10-30`; `COMPLETE_WORKSPACE_INVENTORY.json` (1,006 indexed files). This inventory is an older Guardian film/compositing backup, **not** an approved native 3D world delivery.

## Findings
- **0** paths ending in `.glb` or `.gltf` in this inventory.
- Older portal references include `reference/portal_world_atlas_original.png`, `reference/portal_worlds/01_Work.png` through `08_STAARVERSE.png`, `project/Portal_Worlds_9s_COMPOSITING_PREVIEW.mp4`, `project/Portals_8Worlds_RGBA_COMPOSITE_CANDIDATE.mov`, and `project/revision_10/G_EXIT_START_PORTALS.png`.
- These are **eight-world or earlier review/compositing references**, not proof of the user's subsequently locked nine portals or ten final 3D environments.
- `project/local_models/canonical_face_model.obj` is a face geometry source, **not** the approved rigged armored Guardian GLB.
- The recovery README explicitly labels some later footage **unapproved**. Do not silently promote it to production.

## Release safety and preservation
1. Preserve the currently locked startup video/audio unchanged; verify startup SHA-256 `1c8dce7f7b5f18e9ae580ec14910a0e20939cb8b52ec43897a08d2ecaa98886c`.
2. Do not overwrite locked portal designs with this backup's eight-world atlas or previews.
3. Source the *actual approved* armored Guardian GLB and ten world GLBs from the owner-controlled 3D export workspace; do not fabricate placeholder GLBs or rename image/video files.
4. Match every model to its locked reference, SHA-256, provenance/rights, and independent visual/device acceptance before populating production asset paths.
5. Run the production verifier and inspect the authenticated private EAS upload archive before using another EAS build credit. A passing source CI run alone is not certification.

## Current gate
**BLOCKED:** 0/11 final GLB binaries recovered from this particular backup; approved locked portal reference set and authenticated EAS archive not verified from this source. This document is a curation record, **not** asset approval, implementation, or release certification.
