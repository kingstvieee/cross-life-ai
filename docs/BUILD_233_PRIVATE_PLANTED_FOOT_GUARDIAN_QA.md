# STAARWAARDD Guardian Build 233 — alternating foot plant QA and production release hold

## Founder locks preserved

- **Face:** The founder-approved Build 228 exact appearance identity fingerprint is retained. Protected initial embedded GLB binary prefix: 4,735,136 bytes, SHA-256 `ee78ab8bc97a7cad9853c878ace2d11d528ca9f4f981a0d5aff75ac8fc89c03d`.
- **Private Build 233 visual finish:** The independently reviewed chrome-and-gold Build 231 private candidate is used solely as the source of this engineering experiment.
- **Other active finish directive:** A separate Build 232 mainline session selected black titanium and gold. This new Build 233 QA integration does **not** overwrite that setting or claim that competing user instructions are resolved.

## Actual new Build 233 asset, private only

Private file `Guardian_Build233_ChromeGold_PlantedFoot_QA_NOT_APPROVED.glb` at exact SHA-256 `66e6821f4e776ac7a957e8a566de71731a555cdc006714e1e448d58a85fb80dc`, 10,674,004 bytes.

Inputs: exact chrome/gold Build 231 parent SHA-256 `cca5092a8971c7817dab3301b4540c8a9b53844bc1aa0257840bf9db957a077c`, inherited Build 229 full-body 173 meshes, original Build 228 face/animation source.

Implemented **alternating in-place test step**, rather than the previous both-legs-swinging test. At t = 0.5 s, the left foot remains planted while the right advances; at t = 1.5 s, the right remains planted while the left advances. Two ankle rotation channels counter-rotate knee+hip pitch to keep the moving shoe upright. Gentle opposite arm motion; no root translation. The complete original face geometry, three facial animation clips, 16 facial morph targets, 16-joint body skeleton, armour panels, variants and skin weights are unchanged.

## Measured independent offline QA

Actual binary was reparsed and loaded by Trimesh with **173** geometry objects. CPU skinning independently computed bone matrices and world-space foot vertices at **9 frames**, t = 0–2 s in 0.25 s increments.

- Left planted-foot drift at right-swing maximum: **0.0000000153 m**.
- Right planted-foot drift at left-swing maximum: **0.0000000153 m**.
- Swing foot sole clearance above original rest-plane: **0.04499 m** in either swing.
- Forward displacement at each swing maximum: **0.48819 m**.
- All nine sampled frames stay on or above the original ground-plane for both soles; full rest recovery at t = 0, 1, and 2 s.
- **480** disconnected rigid armour components passed sampled plate distance preservation, maximum absolute pair-length error **0.0000001576 m**.
- Identity source binary, mesh descriptors and original facial animations are **byte-for-byte / object-wise retained**.

These checks **do not** establish a production-quality natural walk, physics collision, foot-to-floor tracking on an actual level, root motion, body-to-face synchronization under motion, GPU/deployed renderer behavior, rights acceptance, iPhone performance or owner final body rig approval.

## Storage, source control, and release protection

Private archive (GLB, builder source, independent verifier, JSON results, readable QA visualization and README):

`/Projects/STAARWAARDD/STAAR Hub/Private Release Staging/STAARWAARDD_Build233_Private_FootPlant_Rig_QA_NOT_APPROVED.zip`

No private GLB, photo or soundtrack is committed to GitHub. Its exact hash is explicitly denied by the runtime and importer so an all-true forged receipt cannot install it. New regression test runs under the Guardian Release Gates workflow. Production still uses the original approved assets.

## Next acceptance: do not fabricate

Actual foot-contact IK / root locomotion and full-body animator review; physical iPhone with captured audio-bound face performance, Guardian posture/neck/finger QA and 10-world collision/device regression; authenticated providers and independent StarCenttinel recovery/revocation; authentic private Expo EAS archive with locked music and film; Apple signed IPA; actual App Store Connect TestFlight upload receipt and founder installation acceptance.

**Release status: NO-GO.** No direct paid generation credits, new subscription or external cost (CAD $0). No Apple signing or distribution performed.
