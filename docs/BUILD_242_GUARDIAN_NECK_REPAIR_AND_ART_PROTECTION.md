# STAARWAARDD Guardian Build 242 — actual private GLB structural review / protected neck gate
Date: 2026-11-20 Toronto. **Production/Apple release: NO-GO.** Incremental paid spend: **CAD $0**. No EAS build requested.

## Owner-supplied private artifact checked
- Source: `Guardian_Build242_Private_NeckLock_Repair_Review.zip`.
- Model: `Guardian_Build242_BlackGold_WalkRun_PortalHead_NeckLock_QA_NOT_RELEASED.glb`, 10,749,052 bytes.
- SHA-256: `8c2ed15001070453e232809492de8916d2e46313d835d21556e6a8fc80dcb768`.
- Exact Build241 source SHA: `667f68dc172cd8dde66b25227604929582d2b86e39e50c1eb87a368e94bd59da`.
- Approved Build228 protected facial BIN prefix SHA: `ee78ab8bc97a7cad9853c878ace2d11d528ca9f4f981a0d5aff75ac8fc89c03d`.

The supplied independent verification script was rerun on the **actual paired 241/242 GLBs**: 18/18 structural/animation tests passed, including the protected facial prefix, exact previous skin and mesh descriptors, 13 required limb tracks, all nine head-look target poses and rest-pose continuity.

Build241 separated the head from moving neck by up to 0.285 model units during a sampled run pose (~7 cm at the displayed review scale). Build242 reparented `STAAR_Guardian_Head` (GLB node 161) under `B230_QA_Joint_Neck` (node 181) at a rest-preserving local offset [0,0,0.79], and its 7 body clips showed <=4.5e-16 units head-neck offset drift in numeric sampling. This is a node-distance finding, **not a collision/skin seam certification**. The user-provided comparison image still shows angular red neck/collar geometry.

Build242 added min/max to animation timelines and eased the nine-head-look clip to 377 keys at 30 fps. The provided glTF validator summary reports 89 errors in 241 and 0 errors in 242; this external validator run was **reported by the source package** rather than reproduced by an independent installed Khronos CLI.

## Remaining findings
1. **Protected face winding (high):** face has inward triangles and normals, while `Owner_real_face_UV_projection_three_dimensional_study` remains `doubleSided: true`. Do not flip or mutate the approved face geometry without an exact binary-specific visual acceptance.
2. **Legacy geometry (medium):** `LEGACY_Build225_PrimitiveArmor_HIDDEN` retains 149 zero-scale static meshes, including old silver/mirror materials. It must not reappear.
3. **Animation collision (low):** `BUILD191_REVIEW_DEMO_NOT_SPEECH_CALIBRATED` and `BUILD241_NINE_PORTAL_HEAD_LOOK_QA_NOT_APPROVED` both have a head rotation track. Never play both alongside live head tracking. The current Guardian `createModelMotion` already permits only specifically named idle/hover/breathing clips, not these two review clips.
4. **Portability (low):** 9 validator warnings reportedly remain about scene root/skins. Native Three.js and physical iPhone render/performance verification are outstanding.
5. **Identity/art quality (blocking):** face resemblance, natural gait, shoulder/knee deformation, neck and collar nonintersection, hand anatomy, voice/mouth sync and final approval remain unverified.

## Source-only mitigation implemented (PR #171)
- New `frontend/scene-src/guardian-rig-integrity.js`: on an **independently accepted asset only**, require an actual skinned head bone parented to neck, unique protected face mesh, all sixteen visemes, and double-sided facial material. If any fail, keep the locked 2D Guardian; don't show the defective rig.
- The verifier can detach the exact zero-scale 149-child legacy group **after** GLTFLoader parses it. No bytes, photos or face geometry are altered; no shared texture/material disposal is performed.
- New source regression tests run in Guardian Release Gates. CI and virtual iOS compile are not real hardware certification.
- Private Build242 bytes remain owner-controlled; **never** push this model to the public repo or place it into production without signed release evidence.

## Next hard release gate
Private founder render review of exact model; exact GLB rights/provenance and owner sign-off; ten verified world models; iPhone actual 30+ second animation+voice/collision/performance evidence; independent StarCenttinel recovery/security; authenticated EAS archive; signed IPA and verified TestFlight upload. Keep production audio/video SHA untouched.

**Build 242 is an engineering review candidate, not an installed release.**
