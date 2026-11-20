# STAARWAARDD Guardian Build 241 — locked body study + portal head tracking

**Review outcome: technical QA PASS, 3D APP RELEASE NO-GO.** No Expo or TestFlight build initiated. Direct additional spend: **CAD $0**.

## Source recovery, identity and finish
- Existing private Build 228 facial GLB approved visual appearance remains immutable. The first **4,735,136** embedded facial binary bytes, SHA-256 `ee78ab8bc97a7cad9853c878ace2d11d528ca9f4f981a0d5aff75ac8fc89c03d`, were retained from the private Build236 source.
- Full-body model inherits **16** estimated body joints, **173** mesh definitions, **16** facial targets, all **3** original facial clips and **6** walk/run body clips from Build236.
- Locked default body material is Build232's independently selected **black titanium + gold**. Chrome/gold remains a review-only material variant. No startup video/audio, original photos or facial geometry is replaced.
- Private review GLB SHA-256 `667f68dc172cd8dde66b25227604929582d2b86e39e50c1eb87a368e94bd59da`, **10,740,816 bytes**, distributed as a private owner artifact, **not** committed to GitHub.
- The private derived model wraps its original Z-up roots into glTF standard Y-up; the model has one extra, non-deforming scene root. The app only applies the axis conversion when an exact verified binary explicitly declares Z-up.
- The private GLB also contains a nine-portal orientation **review animation** `BUILD241_NINE_PORTAL_HEAD_LOOK_QA_NOT_APPROVED`: one head bone rotation track with **20 quaternion samples**, bounded to ±20° yaw and ±3° pitch, not modifying jaw, tongue, lips, face animation or skinned body geometry.
- Independent offline verifier passed **18/18** structural checks, including exact original 10 clip descriptors, 16 joints, face binary, material lock and root transform. These do NOT establish natural physical movement or approved facial performance on a phone.

## App source implemented
- `frontend/scene-src/guardian-head-tracking.js`: focus actual `STAAR_Guardian_Head` **skin bone** only after externally validated GLB load. Reject duplicate/missing/unskinned head, malformed vectors, target behind the character and excessive movement; limit yaw ±22°, pitch ±9°, ease toward neutral when focus clears.
- `frontend/scene-src/worlds.js`: wire model focus to hub portal hover using a bounded camera-facing cinematic bearing (portals are positioned behind the front-facing character); preserve reduced-motion preference and locked 2D fallback, cleanup on scene teardown. Neither static 2D stand-in nor unapproved private candidate gets activated.
- `frontend/tests/build241-guardian-head-tracking.test.mjs`: unit coverage for model gate, head movement, jaw preservation, limits, reset, disposal, bad input and reduced motion.
- Guardian release CI runs the new test. Real device certification stays fail closed.

## Why this is NOT a production installation
The private Build241 GLB remains a review candidate without full-body movement approval, real-iPhone captured QA, verified source/binary-specific rights acceptance, independent security release proof, ten approved world assets, signed EAS IPA or TestFlight acceptance. A source PR is not a new iPhone build.

**No new EAS build credit is used until the authorized asset, user review and archive/source QA gates pass.**
