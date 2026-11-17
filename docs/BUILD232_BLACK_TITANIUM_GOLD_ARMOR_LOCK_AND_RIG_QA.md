# Guardian Build 232 — owner-locked black titanium + gold, approved Build 228 face

**Date:** November 17, 2026 (Toronto)  
**Production verdict:** **NO-GO** — private animation development candidate, not a signed or hardware-accepted Guardian.

## Owner's explicit visual selection
The owner selected **black titanium and gold** for Build 229 full-body armour, overriding only the paint/material treatment in the older silver/chrome 2D design. The locked legacy image SHA remains unchanged. Preserve the founder visually accepted Build 228 head **exactly**; do not infer that owner approval extends to the Build 229/230/231/232 full-body rig or rendered gait.

### Default vs alternate
- Full-body suit's **default GLB primitive material** is **23**: `B229_VARIANT_black_titanium_no_silver`, PBR base colour [0.1,0.105,0.12,1], metallic 0.95, roughness 0.22.
- `B229_gold` still uses PBR material **20**, and both gold trim and the maple-leaf chest emblem are preserved.
- A separately selectable chrome + gold style remains **legacy review only**; the fallback primitive material is **not** chrome.
- `KHR_materials_variants` preserves both named mappings so an inspector can choose between them, but a release validator requires black as core default.
- The production importer now validates actual glTF material data, material names, metallicity, gold presence, founder lock metadata and variants. JSON claims alone are not sufficient.

## New exact private GLB
- Derived from the **independently QA-tested Build 231 rig** SHA `cca5092a8971c7817dab3301b4540c8a9b53844bc1aa0257840bf9db957a077c`.
- Build 232 SHA **`ecc3c9660cd3bacef39c5ca28193b2c67a4ec5ff433c77347ce58b741bc456f9`**; **10,673,100 bytes**.
- The GLB binary geometry/animation bytes are **identical** to Build 231 and preserve all Build 229 original data prefixes. The previously visually accepted Build 228 head geometry, its original skin/morph target definitions and its 3 animation clips are unmodified.
- Body QA: **16 estimated joints**, **8 skinned body mesh groups**, **83,446 weighted vertices**, 3 original animation clips plus 1 synthetic gait demonstration. The inherited CPU rig QA gave **0.0000002682 m** maximum rigid plate length preservation error in the five tested times and a largest trial vertex displacement of **0.5072 m**. These figures validate local mathematical deformation, **not** natural gait, clips on actual devices or acceptable posture.
- Newly independent Build 232 inspection verified glTF chunk integrity, binary equality to the verified prior rig, the exact changed default material, normalized finite body weights, original face/animation stability and unchanged 165 pre-existing meshes. No private model bytes or images are committed to the public repo.

## Release and ownership safeguards
- This new exact Build 232 SHA is **explicitly forbidden** from the source importer and native activation path, regardless of a forged all-true receipt.
- New CI unit tests reject accidental chrome default, missing black metallicity, missing gold, missing/faked lock metadata, missing variant mappings, and forged rig approval.
- Build 228 likeness approval **is preserved**. Build 232's **armour finish** is owner approved. The weighted full-body rig **is not approved**, and a synthetic walk demo cannot stand in for physical iPhone motion QA.
- Independent StarCenttinel owner security readback, actual final ten worlds, provider verification, source archive inspection, signed IPA, device playback and App Store Connect/TestFlight receipt remain additional gates.
- The app's existing iOS release configuration is version `1.0.4`, Apple build `106`; it is **not** increased simply because the Guardian private candidate is called Build 232.

## Next technical acceptance
1. Artist/animation review: correct finger and wrist articulation, shoulder and knee deformation, gait foot plant, neck/collar continuity; inspect at least front/side/back with actual animated samples for both walk and speech.
2. Binary-specific rights and founder rig signoff after those corrections; preserve the exact Build 228 face or obtain explicit owner authorization for any change.
3. Owner-controlled signed internal iPhone build with physical performance and A/V sync measurements, security recovery, mobile collision and ten-world acceptance.
4. Inspect the actual EAS production upload archive, verify Apple signature and bundle/build/Team ID, then seek explicit TestFlight release acceptance. Never use green CI as a substitute.

**Additional direct credits or subscriptions spent:** CAD $0. No paid media generation, signing, upload, or TestFlight submission performed.
