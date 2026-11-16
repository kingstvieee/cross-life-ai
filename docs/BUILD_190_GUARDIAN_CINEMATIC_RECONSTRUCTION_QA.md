# STAARWAARDD Guardian — Build 190 technical reconstruction and independent visual verdict

**Development milestone:** 190. **Review verdict:** TECHNICAL PASS, CINEMATIC LIKENESS FAIL. Do not deploy or mark production-ready.

## New delivered model (actual GLB, not an illustration)
- `guardian-build190-articulated-study.glb`: real 3.27 MB, 160 separate scene geometry components, 52,456 triangles, one head/jaw glTF skin with vertex weights, 16 named morph targets on the connected curved head mesh, one 4.8-second technical demonstration animation.
- Original real-photo face is embedded in the head material; it is **not** an accurate reconstructed 3D face from multiangle scans. The approved three cinematic stills remain separate art-direction references.
- Independently generated turntable MP4 from the GLB geometry with front, side, back and intermediate angles, six physical-camera render captures, and three original concept stills arranged side-by-side against the actual model.
- Local byte-level validation passed 27/27 checks: GLB2 self-contained container; embedded buffer geometry; mobile-sized GLB; normalized skin weights; 16 target names and real target POSITION arrays; distinct mouth motion channels; animation sample timestamps; unchanged source photo, armour reference, and approved still hashes.
- The binary, source script, QA JSON, movie and side-by-side board are in `STAARWAARDD_Guardian_Build190_Rig_Review_Package.zip` as a conversation artifact. **They are not uploaded into the GitHub code repository.** This branch records only hashes and safe acceptance metadata.

## Additional provider attempt
A connected free Thrixel account generated sculpt submission `22df3383-95a7-4acf-94b0-8102d3770237` from the approved three-quarter still. Its provider thumbnail looked like a small bust protruding from an image plane, with 1,362 triangles. It was **rejected as insufficiently 3D**, not placed in the runtime or treated as superior. 8 existing free Thrixel cubes consumed; incremental CAD cash **$0**.

## Unresolved blocking defects
1. Continuous head shape is a mathematical anatomical approximation, but photo projection still badly stretches around the profile and is not faithful to the actual person's eyes, ears, jaw and haircut at multiple angles.
2. Silver/gold armour is articulated hard-surface technical geometry but does not approach the photoreal material, fitted plating, rich silhouette, cinematic lighting and crest detail in all three approved portraits.
3. Sixteen morph channels exist technically; they are stylized displacements with no verified spoken-audio timing or realistic face/lip deformation. Not a signed viseme QA.
4. No native iPhone/Apple Watch performance evidence, provider authorizations, accepted rights record or final artist/owner model sign-off.
5. The exact `Starward Guardian(2).m4a` master remains unavailable for final validated lip-sync and startup playback.

## Asset and identity gates
- Real photos `IMG_5711.jpeg` and the foreground white-polo face in `IMG_4824.jpeg` remain authoritative for actual facial identity.
- Three **owner-approved still images** from Build 189 remain the primary costume/lighting *visual direction*, not a substitute for a real 3D head reconstruction.
- Locked silver/gold armour reference SHA remains `d7f18158a91778a7f3ce97c7326b1c75afefdc792c77ab02c4fead0e3ffa659c`.
- This new model must **not** be named `guardian-armored-rig.glb` in the production `frontend/scene-src/assets/` directory until it passes a real multiangle facial/armour review and the Build 187 independent evidence gate.

**Next actual release checkpoint:** Correct or rescan true face geometry from real photographs/video, retopologize, align all 16 organic visemes to approved audio, render 360° in PBR, and obtain actual founder/file/device acceptance. Preserve Build 181–188 source protections.

**No paid CAD charges. No EAS signing or TestFlight submit.**
