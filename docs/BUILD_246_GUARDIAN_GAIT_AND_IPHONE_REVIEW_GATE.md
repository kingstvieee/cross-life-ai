# Guardian Build246 — 111-frame offline motion sweep and stricter iPhone review evidence
Date 2026-11-20 Toronto. **Production verdict NO-GO.** Additional external spend CAD $0. No EAS build or TestFlight submission.

## Private full-clip verification
- Exact private Build244 review GLB SHA-256: `afdf2b3deccc96786faf7cc8357f2d9abed9dd20796bec7b6bd848ff8cc5cfcc`.
- Independent CPU glTF linear-blend-skinning, interpolation and bounds verification on six actual body-animation clips:
  - 42 samples Walk (1.35s); 28 Run (.88s)
  - 11 Walk start (.32s); 12 Walk stop (.35s)
  - 8 Run start (.22s); 10 Run stop (.28s)
- **111/111** sampled frames preserve a fixed neck/head local parent offset (max drift 0).
- All 111 retain **positive** face-min-to-gasket-max vertical spacing: 0.010176–0.016 model units. Minimum vertex-to-vertex gap is 0.083625 model units, roughly 1.9 cm at prior nominal scale. These are independent *numerical* results, **not** a certified natural seam, three.js WebGL runtime, or visual likeness pass.
- Private reproducible script + full body GLB, report and animated comparison are in `Guardian_Build246_Full_Gait_QA_Private.zip` supplied to owner, not committed to public GitHub.

## Fixed report-qualification hole
A Guardian QA report previously could be labelled `REVIEW_REQUIRED` using only 300 rendered frames and one accepted audio packet. The internal Preview QA now requires **all**:
1. an exact independently approved source model loaded, >=300 actual renderer frames, >=1 accepted audio packet;
2. >=60 rendered Walk mode frames AND >=60 Run mode frames (actual frame observation, not tap/command ack);
3. a neck probe bound to the loaded model with actual collar present, >=16 actual measured neck/face poses, and zero pose-probe failures.

Otherwise the report remains `INSUFFICIENT_SAMPLES` or `NO_APPROVED_ASSET`. Every report stays `certification: UNVERIFIED` and `physicalIphoneOwnerAttestation: false`. New negative tests prevent forged mode counts and absent/invalid geometry from passing.

## Remaining release gates
- Exact Build244 art, face rendering and collar acceptance is missing, and the private model remains explicitly denied by production importer and native runtime.
- Real Three.js GLTFLoader rendering of the *exact* private binary in owner-controlled environment, matched face/collar visual QA and independent physical iPhone device QA including active speech, gait and thermal/frame readback.
- Ten 3D environments, rights/provenance, provider authentication, StarCenttinel evidence, EAS signed IPA and App Store Connect/TestFlight owner installation evidence.
- CI success / native compile success / encrypted source metrics cannot replace actual art, model-specific rights or hardware owner acceptance.
