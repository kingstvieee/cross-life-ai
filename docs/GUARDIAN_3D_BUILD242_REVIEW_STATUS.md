# STAARWAARDD Guardian — Build 242 private motion review

Status: offline articulated character candidate, NOT certified for app release.

## Implemented
- 13 body articulation pivots with validated walk, run, start, stop, breathing and portal-gesture clips.
- Three.js virtual-camera orientation and head tracking; no phone-camera capture.
- Portal selection queues physical approach and arm-opening gesture before navigating.
- The original face mesh, morph targets, 3 facial clips, armor geometry, materials, and binary mesh data remain unchanged.
- Existing fallback remains the locked nine-portal image when no independently approved live rig is bundled.

## Verifications
- Input Build228 SHA-256: 4d739795c55711a19cd6c4ccb670053697b3ed8e23c2e3648940dac43433540b.
- Output Build242 GLB SHA-256: 55e8b30126878dfc69ad9def9c0a19a60851bc1164aaf2af972a03165a02834e.
- 165 original meshes preserved; original three facial clips plus eight review motion clips.
- Model parsed successfully by Three.js and imported by Blender; glTF validator reported zero errors/warnings.
- Private 5-second walk/gesture MP4 and GIF are rendered and saved in the owner-connected Simular workspace.
- WebGL not available in current remote desktop due to Mesa software-renderer failure; offline Blender rendering substituted. This is NOT iPhone certification.

## Review-only files
All private avatar binaries and previews are stored at /workspace/staar-private-review/REVIEW_ONLY/ in the connected Box by Simular workspace, including Guardian_Build242_PRIVATE_REVIEW.zip and Guardian_Build242_Review_Manifest.json. Do not push these assets to public GitHub or enable the release gate.

## Outstanding acceptance
1. Facial likeness and armor proportions: the base GLB retains ownerPhotoLikenessApproved:false metadata and the new proportions have not been owner-accepted.
2. Natural realism: the walk is an articulated rigid-segment test, not final professional smooth body deformation / foot-plant IK.
3. Eye blinks, user-facing microexpressions, viseme synchronization and 3D portal choreography must be finished and visually inspected.
4. Real iPhone performance, rendering, playback, and fallbacks must be independently tested.
5. After explicit final asset acceptance, update the protected asset receipt, sign a new internal QA/TestFlight package and obtain physical device certification.

Nothing here authorizes spending or public App Store submission.
