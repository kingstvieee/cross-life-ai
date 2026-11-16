# STAARWAARDD — ARMOURED GUARDIAN 3D MASTER

**Status:** founder-approved 2D visual reference; production 3D facial/armour model pending construction and acceptance.

## Authoritative approved design
- **Source Library:** `/STAARWAARDD/Guardian/Locked References/STAARWAARDD_Guardian_Armored_Locked_Reference.png`
- **Image fingerprint (SHA-256):** `d7f18158a91778a7f3ce97c7326b1c75afefdc792c77ab02c4fead0e3ffa659c`
- **Image dimensions:** 1199 × 1312 RGB pixels
- **Visual identity:** male Guardian, short curved-shaved-detail low fade, stud earrings and small nose stud, face shape and proportions exactly as approved.
- **Required costume:** full layered silver/gunmetal futuristic protective *armour* with articulated shoulder plates, armoured collar and warm gold illuminated edge detailing, not a black athletic tracksuit.
- **Emblem:** centered circular gold ring with gold maple leaf. Keep exact readable symbolism.
- **Scene context:** Toronto skyline and CN Tower at dusk; visual background is NOT baked onto the character mesh.
- **Permitted motion:** natural speaking face, eye focus and head tracking; articulated shoulders/neck/breastplate without clipping. Approved facial features never change with pose.
- **Not permitted:** switching the suit to a tracksuit, replacing the face with a generic person, adding a new helmet covering the face, swapping the crest, or altering the locked startup film.

## Required production deliverables
1. `guardian-armored-base.glb`: a textured, skinned, production-ready 3D character including separate, independently articulated face, jaw, eyes, neck, shoulder plates and torso.
2. `guardian-armored-rig.glb`: identical approved identity including all 16 standardized mouth/neutral targets: `rest`, `sil`, `PP`, `FF`, `TH`, `DD`, `kk`, `CH`, `SS`, `nn`, `RR`, `aa`, `E`, `I`, `O`, `U`. Existing account-protected mouth-timing requires one-to-one target mapping.
3. `guardian-turntable.mp4`: full head+body views at 0°, 45°, 90°, 180° and 270°, neutral/smile/speaking and three-quarter profiles, alongside the approved still for identity comparison.
4. `guardian-speech-qa.mp4`: one 15–30-second permitted sample proving that the *real approved rig* follows synchronized audio-derived visemes without a substitute face.
5. `guardian-armor-asset-receipt.json`: source SHA, production model SHA, blendshape inventory, generator/artist origin, licence and export rights, version and founder sign-off.
6. 3D runtime screenshots on an actual target iPhone at 12:00–22:00 local use window, proving face detail at close range and full armour in motion.

## Provisional engineering budgets (acceptance targets, not evidence of completed assets)
- **Runtime:** iOS performance target 30 fps minimum in Guardian interaction and portals; 60 fps preferred on capable devices.
- **Textures:** PBR metallic/roughness workflow; compressed mobile-friendly textures, initially no greater than 2048² for character materials; tune using actual device profile.
- **Geometry:** target less than 100,000 rendered triangles for the foreground Guardian, with explicit low-detail LOD for portal distance shots; validate after visual approval rather than degrading identity to meet a guessed polycount.
- **Lip sync:** every supplied cue timestamp strictly increasing, within actual verified MP3 playback duration, morph weight in [0,1], and mismatched audio SHA fails closed.
- **QA:** validate at least three face views and 16/16 morph targets; test speech pause/resume/cancel, quiet/private mode, account switch and app suspension. No mouth movement without approved rig.
- **Cinematic acceptance:** silver/gloss/gold must remain legible under both daylight and Toronto-night lighting; no clipped shoulder plates or crest distortion.

## Production sequence
**A.** Convert the exact locked PNG into an initial geometry *study*. Treat any automatically generated mesh as a **blockout** only: one image cannot reliably reconstruct the unseen face profile, topology, eyes, oral cavity or working facial rig.

**B.** Sculpt and verify face likeness from front, three-quarter and profile. Reconstruct plate-by-plate armour, metallic PBR and gold maple-leaf emblem. Create appropriate topology and separate cloth/rigid hard-surface components.

**C.** Rig jaw, eyes, facial morph targets and head/neck/shoulder pivots. Export GLB and produce neutral + speech turntables.

**D.** Obtain founder approval of face, armour and rig with the locked PNG visible for direct comparison. Freeze approved model SHA-256.

**E.** Integrate approved GLB into 3D Guardian runtime, replacing ONLY the character display component after passing `canActivateArmoredGuardian3D()`. Never alter the already locked startup movie.

**F.** Verify playback on actual iPhone, sign in/out, voice permissions, mouth cue alignment, 9-world transitions, performance and Watch interoperability before presenting a TestFlight candidate.

## Nine immersive scenes — separate production track
The approved nine world designs remain as enumerated in `docs/LOCKED_PORTAL_REGISTER.md` and `frontend/src/locked-world-acceptance.ts`: Home, Work, Dreams, Health, Love (including independent Singles), Village, Closet, STARVERSE and STAARSONIC. Each needs an authored 3D environment, individual interaction QA, signed art approval and real-device capture. The currently generated Three.js geometry remains a developmental preview, even if it is navigable.

## Spend and approval gate
**Committed paid third-party generation in this 3D production handoff: CAD $0.** A 3D conversion UI was opened; no charged conversion or purchase was submitted by the assistant. Before any paid render, obtain a specific provider quote in CAD, expected credits, source ownership/licensing and maximum approved cap.

**Do not certify final rig complete until actual models, evidence and signature exist.**


## Build 174 — verified runtime GLB delivery
The offline scene compiler now supports a founder-approved production model. To install it, the two **separate, actually existing** files must be supplied together under `frontend/scene-src/assets/`:
- `guardian-armored-rig.glb` — glTF 2.0 embedded binary, with a skinned mesh and all 16 named facial targets on the same mesh.
- `guardian-armor-asset-receipt.json` — signed-off review data matching exact binary SHA-256 and the already locked reference fingerprint.

Required receipt JSON fields (replace placeholders **only after actual acceptance**, never submit a fabricated review):
```json
{
  "schema": "staar-armored-guardian-v1",
  "sourceImageSha256": "d7f18158a91778a7f3ce97c7326b1c75afefdc792c77ab02c4fead0e3ffa659c",
  "rigModelSha256": "REPLACE_WITH_REAL_SHA256",
  "identityAssetId": "guardian-armored-v1-approved",
  "founderApprovedRig": false,
  "faceFidelityReviewed": false,
  "armorFidelityReviewed": false,
  "frontThreeQuarterProfileReviewed": false,
  "speechSyncDeviceVerified": false,
  "exportRightsConfirmed": false
}
```
The sample is intentionally **not deployable**. A completed receipt requires real founder sign-off and rights documentation; true review cannot be proven by a self-asserted JSON field alone.

Build-time security: if both files are absent, keep the already locked Guardian image and normal portal previews. If just one is present, fail the build. If either has a bad hash, wrong identity, external asset references, unsupported compression, no embedded geometry or missing skinned facial targets, fail the build. If validated, the compiler embeds the approved GLB inside the offline WebGL runtime and loads it only in the central Hub; the locked startup film never changes.

Performance note: embedding a large GLB adds approximately 4/3 its binary size to the generated HTML before JavaScript bundling. Actual iPhone memory, frame timing, animation mapping and sustained temperature must be measured before this production path can be called accepted.
