# STAARWAARDD Build 208 — Private Facial Viseme QA Candidate (NOT PRODUCTION)

**Date:** November 16, 2026. **Spend:** CAD $0 external cash. The Build 207 mainline CI trigger has already merged independently.

## Input and immutable source
Original Guardian from archived Build 198 private 3D studio: `da1848abf56884827abe3315a7ed2108a4301eb62be9bfd5b6d0e058354e8395`.
Original archive remains quarantined; the owner expressly rejected the legacy 3D face's likeness.

## Private experimental candidate
SHA-256 `09dcb3cb56b70f5a2b38e5d5f68de627a62df5ad42ad89e2f9d9123d92cf70b5`.
Filename: `guardian-build208-private-qa-visemes-not-approved.glb`.
The private binary is delivered only in the owner chat as `STAARWAARDD_Build208_Private_Guardian_Viseme_QA.zip` and **is not in GitHub**.

Actual independent inspection of the 10,285-vertex facial mesh found 16 named target slots. The original had collinear speaking shapes. In a **QA-only derivative**, fourteen speaking-target POSITION buffers were changed with local lip deformation. The GLB header, complete glTF JSON, materials, textures, nodes, skin, animation clips and neutral `rest`/`sil` deltas stayed byte-identical.

The existing Build 204 structural validator now reports `checkedSpeechTargets=14`, `vertexCount=10285`, `maxAbsSpeechMorphCosine=0.9987765`, passing its 0.9999 collision/independence threshold.

## Binding negative final-approval result
A purely numerical morph pass does **not** prove a recognizable face, natural pronunciation, authentic 90° side profile, texture seams fixed, synchronized speech, licensing/rights, or a phone/watch playback pass. Final likeness remains unaccepted; Build 202 and this Build 208 source are both specifically blocked by the asset loader **and** the app runtime activation function. No forged positive receipt may override those hashes.

## EAS and TestFlight
Do not stage this private GLB into `guardian-armored-rig.glb`; keep using the approved original static Guardian display. The signed release requires the **distinct** truly final-reviewed GLB and actual independent evidence. No EAS, Expo, iOS IPA or App Store Connect submission occurred in this change.
