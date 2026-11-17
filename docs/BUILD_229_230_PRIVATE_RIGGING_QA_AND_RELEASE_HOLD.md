# Builds 229–230: new Guardian full-body QA, experimental rig, and Apple production hold

**Status:** PRIVATE, NOT FOUNDER APPROVED, NOT RELEASE CERTIFIED. **Direct additional paid expense:** CAD $0.

## Exact Build 229 input
- The user uploaded Build 229 GLB and its original private review archive and four-view reference images.
- The archive GLB and separately attached binary match exactly.
- 8,660,232 bytes; SHA-256 `84295da28d4b580f83cad8786cf684ea498c45d5185c85a7d09955b9c6b5f5b4`.
- Independent structural read: all 302 original accessors are in bounds and all checked float components finite.
- All Build 228 facial mesh and geometry buffer bytes remain unchanged; original head/jaw skin, 16 facial morphs and 3 original animations preserved.
- The new full-body meshes contain 83,446 vertices, but none contains JOINTS_0 or WEIGHTS_0 and no body skin exists. That **static body is not a production-animated Guardian**.
- Two KHR_materials_variants: default chrome/gold and optional black titanium/gold. Both are visual reviews, not independently approved armour masters.
- The authored Z-up extents differ materially from legacy camera framing; change requires visual/device camera QA.

## Exact private Build 230 proof-of-concept
- Derived **locally, without paid generation**, from untouched Build 229 GLB.
- Output 10,672,316 bytes; SHA-256 `656a12b79a334e6d0a4301b666df5098f0ab6ae1387a5195904b978fc5415130`.
- Adds one **16-joint approximate body skin** and JOINTS_0 / WEIGHTS_0 to 8 body material meshes, weighting 83,446 positions. Includes one short illustrative, non-certified arm/leg swing test animation.
- Independent checks: glTF chunk integrity, joint bounds, normalized weights, finite values, inverse-bind matrices, mesh parse by trimesh; exact untouched original binary buffer prefix, first 165 original meshes, head skin, original animation tracks and two finish variants.
- These are **algorithmic anatomical weight estimates**, not sculptor-reviewed weights or a physically captured walking/mouth sync performance. The head is still driven separately from the added body skin, with neck continuity and engine playback unverified. No 60 fps iPhone evidence was captured.
- Reproducible source, QA metrics and source images are in the private-only ZIP: `STAARWAARDD_Build230_Private_Experimental_BodyRig_NOT_APPROVED.zip`. **Never commit this ZIP or GLB to public GitHub**.

## Binding production gates
- The founder's exact Build 228 **facial visual** signoff remains recorded and unchanged; it is **not** blanket acceptance of a new armour/full-body binary.
- Both private Build 229 and 230 SHA hashes are explicitly **refused** by the importer and native approval pathway, even if a forged all-true receipt is supplied.
- New CI regression enforces these exclusions and checks that Build 228 founder appearance approval is preserved without inventing signed Apple IPA evidence.
- Completion requires proper artist review of anatomical deformation, neck/face seam, arm/wrist/finger joints, armour material selection, walking/running/transformation, audio-bound 16 morph animation, 10-world performance and collision, rights and SHA-specific owner acceptance.
- Apple remains **NO-GO**: physical-iPhone/Watch, independent security recovery/revocation, actual EAS archive, signed IPA, App Store Connect TestFlight receipt and owner acceptance are all required. Configured Apple build 106 is not the same as a signed or installed build.

**Release verdict:** neither Build 229 nor Build 230 may be promoted yet.
