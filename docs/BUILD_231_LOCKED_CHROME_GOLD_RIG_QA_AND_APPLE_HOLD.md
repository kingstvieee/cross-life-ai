# STAARWAARDD Guardian Build 231 — chrome/gold finish locked; refined private body rig

**Founder decision:** November 17, 2026 (Toronto): "Lock the Build 229 Guardian armour finish as chrome and gold. Preserve the founder-approved Build 228 face." This is a **binding material direction**. It is not approval to publish a new model or to bypass independent iPhone/Apple security requirements.

## Final art direction for the current design
- Selected: **Build 229 polished chrome (silver) and gold**, articulated metallic pauldrons, gunmetal underlayer and gold-edged maple-leaf chest medallion. The Build 229 original glTF variant index **0** is the default, using chrome material 18, light-gold trim 19 and polished gold 20.
- Retained solely as a historical preview: alternate **black titanium and gold** variant 1, not the production default. Do not silently switch materials.
- Founder-approved face remains the exact creative likeness associated with Build 228 SHA-256 `4d739795c55711a19cd6c4ccb670053697b3ed8e23c2e3648940dac43433540b`; original 16 face targets and 3 clips are unchanged.
- The first **4,735,136** bytes of the embedded approved Build 228 binary inside Build 229/230/231 are byte-for-byte identical. Original bytes SHA-256: `ee78ab8bc97a7cad9853c878ace2d11d528ca9f4f981a0d5aff75ac8fc89c03d`. The importer now denies B229-family output with altered protected face bytes. Merely supplying approval booleans cannot recover that exact content.

## New private Build 231 artifact
- Source: user's original Build 229 GLB `84295da28d4b580f83cad8786cf684ea498c45d5185c85a7d09955b9c6b5f5b4` and prior Build 230 experiment `656a12b79a334e6d0a4301b666df5098f0ab6ae1387a5195904b978fc5415130`.
- Refined output: `cca5092a8971c7817dab3301b4540c8a9b53844bc1aa0257840bf9db957a077c`, 10,672,816 bytes.
- Eight material-separated meshes, **83,446** skin-weighted vertices, **16** prototype body joints. The 480 disconnected armour components (74,907 vertices) now each follow a single rigid joint rather than smoothly stretching across plate interiors. Blended weights apply to 8,539 soft undersuit vertices, including elbow/knee/ankle transitions.
- Artifical 2-second sample gait amplitude was reduced. Five local CPU-skinned samples (0 / 0.5 / 1.0 / 1.5 / 2.0 s) passed integrity, original rest-pose recovery, finite vertex/normalized weight checks, single-bone plate checks and source head preservation. Maximum synthetic displacement **0.507166 m**; maximum sampled panel-pair length deviation **0.0000002683 m**. These are **only structural tests**, not photographic motion certification.
- Three original head animation clips, 16 face morph targets, original mesh buffer prefix, default finish and original material variant remain unchanged. GLB also parsed with Trimesh.
- Provenance script, detailed per-pose calculations and binary privately archived at:
  `/Projects/STAARWAARDD/STAAR Hub/Private Release Staging/STAARWAARDD_Build231_ChromeGold_Private_Rig_QA_NOT_APPROVED.zip`.

## Release protection
- Explicitly **deny** the exact Build 231 binary from public/native activation. Build 228 facial visual approval **does not** become Build 231 full-body/physical iPhone approval.
- A production Guardian receipt now must record `armorFinish: "chrome-and-gold"` and comply with exact approved face-binary preservation for B229-derived full bodies; previous visual/rights/device checks remain required.
- The source-control manifest `frontend/scene-src/build231-chromegold-rig-review.json` holds non-private SHA references, finish/variant selection, measured offline QA and explicit false production gates. No private models, faces or soundtrack pushed into public GitHub.

## Outstanding work / exact acceptance evidence
1. Professional artist review of real rotation/pivot behavior, shoulders/hips, elbow/knee armor collision, finger/hand articulation and neck-face continuity; rigging is **not yet production-quality** by observed animation standards.
2. Actual animation playback and captured frame measurements on an **owner-authorized physical iPhone**, authentic audio-bound **16-viseme** performance, actual 10-world collision navigation and device/Watch recovery tests.
3. Independent owner-security WebAuthn recovery/revocation and signed enforcing StarCenttinel readback; live service previously returned `LOCKDOWN`.
4. Final 10-world rights/visual/geometry receipts, real authenticated Expo `build:inspect` archive with original locked Guardian soundtrack and film, private Apple signing on the correct team, actual signed IPA `1.0.4 (106)`, App Store Connect/TestFlight upload receipt and founder device signoff.

**Production release verdict: NO-GO.** The new GLB, music or facial data must not be uploaded to public GitHub; CI passing cannot replace evidence of Apple signing or real-device certification.

**Direct additional paid generation expense: CAD $0.**
