# Guardian Build 244 — private neckline mesh study, renderer comparison, and release quarantine
**Date:** 2026-11-20 (Toronto) · **Spend:** CAD $0 · **Apple/EAS release:** NO-GO

## Exact private inputs and output
- Previously verified protected Build243 review GLB SHA-256: `804f4e0f714bcbde63572d8ac83cb11a9a6c2e6ee888117b749a591df163ae78`.
- New Build244 review-only GLB SHA-256: `afdf2b3deccc96786faf7cc8357f2d9abed9dd20796bec7b6bd848ff8cc5cfcc`, **11,139,572 bytes**.
- Original protected Build228 face BIN prefix SHA-256: `ee78ab8bc97a7cad9853c878ace2d11d528ca9f4f981a0d5aff75ac8fc89c03d`.
- Private artifact delivered in user conversation, not this GitHub repository: `STAARWAARDD_Guardian_Build244_Private_Review.zip`.

## Changes to private review model
Build244 appends two tiny unskinned, removable collar-continuity meshes under existing `B230_QA_Joint_Neck`: a dark black titanium gasket and a gold lower-seam liner, without changing any prior buffer bytes, face geometry/UV/texture data, morph targets, facial clip, body mesh, skin, or armoured suit material. Its top edge rests below the facial mesh minimum-Z reference. This is a **cosmetic study**, not a founder-approved final armor change.

### Independently executed local checks
- **19 of 19** checks pass comparing exact Build243/244 GLB bytes, all 173 source mesh descriptors, original materials, 11 animation clips, both skins/IBMs, protected head and facial nodes, source graph, and exact SHA.
- Both versions **loaded and rendered** through an independent VTK glTF importer: **24 versus 26** visible actors, **11** reported clips each.
- Matched camera captures: frontal head/chest, three-quarter head/chest, right-profile head/chest, full body.
- Visually, frontal collar line looks less abrupt; side collar still appears hard. This is **not** artistic neck-seam or profile likeness approval.
- No official Khronos glTF validator invocation, physical iPhone frame telemetry, externally filmed foot contact, real speaker sync, Apple signed IPA or TestFlight activity was performed.

## Animated imported-source review — additional caution
VTK independently enumerated all **11** clips in both exact binary files, then played `WALK_IN_PLACE_BODY_QA` at **0, 0.34, 0.65 and 1.00 seconds**, with a fixed camera. New private comparison image: `Guardian_Build243_244_AnimatedWalk_NeckQA.png`. The moving renders exhibit an **apparent difference in head/collar position** between Build243 and Build244. Because the original skin, head joints and animation bytes remain identical, a renderer-specific skin-child processing effect is possible. The mismatch is **unresolved**, not approved or explained away. It requires explicit Three.js/WKWebView QA, owner review, and physical-device readback before any final asset sign-off. Neither study replaces production identity.

## Source-side release safety hardening
- Both the offline GLB release importer and the native `canActivateArmoredGuardian3D` now explicitly reject exact private **Build241, Build242, Build243 and Build244** SHA-256 digests, even if an attacker supplies all-positive founder/device booleans.
- Added `frontend/tests/build244-review-asset-quarantine.test.mjs` and included it in the Guardian CI release gates.
- Existing approved film/soundtrack SHA, production world assets, user data, and code that renders the accepted 2D Guardian remain unchanged.
- This branch contains **no private GLB, face photo, soundtrack, source image or biometric asset**.

## Remaining stop conditions
No exact binary-specific founder sign-off for Build243's flipped face mesh or Build244's new collar shape. Neck/torso deformation during real walk/run, authentic 16-viseme speech/mouth on physical iPhone, 10 final 3D worlds, rights records, authenticated EAS source archive, signed IPA and installation acceptance are separate mandatory production gates. The current 3D QA result **must not be interpreted as shipped**.
