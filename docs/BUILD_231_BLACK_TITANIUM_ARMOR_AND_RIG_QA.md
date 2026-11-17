> **SUPERSEDED FINISH RECORD (November 17, 2026):** The explicitly selected finish for the current Guardian full-body production direction is **CHROME + GOLD (variant 0)**, not black titanium. This document describes a historical private black titanium prototype only. Its model remains quarantined. See `docs/BUILD_231_LOCKED_CHROME_GOLD_RIG_QA_AND_APPLE_HOLD.md`. No Apple or device acceptance changed.

# STAARWAARDD Guardian — Build 231 black titanium/gold finish lock and rig refinement

**Founder instruction:** "Lock the Build 229 Guardian armour finish as black titanium and gold. Preserve the founder-approved Build 228 face. Continue production-quality rig refinement and verification without bypassing Apple release safeguards."

## Confirmed locked design decision
- Black titanium + gold is the sole **selected** full-body finish for Build 229-family Guardian; in glTF, material variant 1.
- Exact public identity pin: previously founder-accepted Build 228 face GLB SHA `4d739795c55711a19cd6c4ccb670053697b3ed8e23c2e3648940dac43433540b`.
- Existing early 2D locked silver-armour visual remains a historical reference and is not silently overwritten; this instruction supersedes its **finish** only for the newer full-body production direction.
- Original chrome + gold remains inside the review GLB only as an archive/comparison variant, not the default.
- No final-body-artist acceptance, iPhone verification, Apple signing or TestFlight submission is implied by the selected finish.

## Actual private model
- Created new `Guardian_Build231_BlackTitaniumGold_RefinedRig_REVIEW_ONLY.glb` from exact Build 229 source.
- Source Build 229 SHA: `84295da28d4b580f83cad8786cf684ea498c45d5185c85a7d09955b9c6b5f5b4`.
- Private Build 231 SHA: `91bac844779ea58cb45804efd4ffe441f68fab6c2dbbae11e8868f7418b04fbc`.
- Private bundle and scripts remain in owner Library: `/Projects/STAARWAARDD/STAAR Hub/Private Release Staging/STAARWAARDD_Build231_BlackTitaniumGold_Private_Rig_QA_NOT_APPROVED.zip`.
- **No private GLB, model portrait, biometric source, soundtrack, or Apple signing material is committed to this public repository.**

## Implemented technical refinement
1. **Material selection in actual binary:** the Build 229 armour primary primitive now defaults to black titanium material index 23 instead of mirror chrome index 18. Gold trims and emblems are preserved.
2. **Resolved wrong-joint classification:** Build 230's z-before-arm weighting rule treated low sleeves/hands as legs. Build 231 explicitly prioritizes glove/arm geometry, and all 2,098 glove vertices are bound to hand joints.
3. **Preserved segmented metal shapes:** 382 disconnected metal/glass material components are individually assigned rigid joint influence; they are not vertex-blended across plates. This limits stretching, not inter-part collisions.
4. **Adjusted arm joints / gentler gait:** 16 approximate body joints with revised forearm and hand anchors, and a new test-only low-amplitude five-key gait. No foot locking or collision IK is claimed.
5. **Non-substitution face checks:** independent GLB comparison confirms the entire original Build 228 face binary prefix and 165 initial mesh descriptors, all 16 viseme names and original three animation descriptors preserved exactly through Build 229 to Build 231.

## Independently checked
- GLB v2 container, SHA-256 identities and exact material selection.
- 83,446 body vertices have valid normalized JOINTS_0 and WEIGHTS_0 bound to the correct body skin.
- 0 misclassified glove vertices; 382 rigid metal/glass components each mapped to one bone; finite vertex data and valid index ranges.
- Private numeric pose at t=0.5 seconds: glove peak delta 0.306 m versus 0.646 m in Build 230; chrome geometry peak delta 0.568 m versus 1.143 m. These two poses have **different swing angles**, so not comparable as a certified animation-quality metric.
- The private source, QA report, editable rig generator and review instructions are preserved in Library.

## Fail-closed release status
Build 231 is explicitly rejected by BOTH the offline GLB importer and native runtime approval checks using its exact binary SHA, even if a forged all-true receipt is supplied. CI tests this hold and ensures that appearance selection never sets production approval booleans.

Production remains **NO-GO** pending manual sculptor/owner deformation review, neck continuity, proper arm/finger/hip weights, collision and foot contact, true combined head/body facial performance on an actual iPhone, 10-world memory/performance and rights signoffs, separate StarCenttinel enforcing proof, independent private EAS archive, Apple signed IPA, and confirmed TestFlight/owner acceptance.

**New paid credits or external charges:** CAD $0. **App Store/TestFlight submission performed:** No.
