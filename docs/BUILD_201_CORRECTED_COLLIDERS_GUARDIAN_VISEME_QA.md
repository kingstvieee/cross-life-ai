# Build 201 — Collision-corrected worlds and distinct Guardian facial morphs

**Source of truth:** private actual Build 199 GLBs and owner-approved cinematic concept stills. The ten-world design baseline remains intact. This branch records private hash-verified QA evidence; the public repository contains no owner face-textured GLB, music, source photographs or private scene binaries.

## Verified engineering work

Six formerly flagged collision scenes were re-tested with the *actual triangle surfaces* clipped to the avatar-height range 0.38–1.58 m, rasterized at 0.25 m and buffered for a 0.35 m collision radius. This retired four false positives from the earlier whole AABB boxes: Home Residence, STAARSONIC Studio, Style Closet, and Wellbeing Health. The exact source mesh is unchanged in those four cases; GLB node collision-role annotations now distinguish static solids, walking floors, visual props and candidate door triggers.

Two remaining genuine offline route obstructions were corrected as new review GLB versions, preserving the approved original art, material buffers and animation clips:
- Relationships Realm: move **041_Invitation love bench** by **(+0.25 m X, +1.50 m Y)**.
- Work Command: move **374_Command station backlit desktop** by **(+1.00 m X, +1.50 m Y)**.

The exact six corrected source GLBs and six mobile variants are in `STAARWAARDD_Build201_Collision_And_Guardian_Review.zip`, plus per-world model hashes in `frontend/scene-src/build201-collider-guardian-qa.json`. Six-of-six route fixtures are connected, testing the original unsnapped endpoints (0,−10) to (0,+10); no route segments intersect the author-defined inflated exact-mesh occupancy. The mobile variants batch static geometry without triangle loss and retain a review animation loop. **This is not the app's actual physics engine or an iPhone walkthrough; door triggers and authoritative runtime spawn coordinates still require separate implementation and verification.**

### Guardian performance revisions

- New private glTF 2.0 `guardian-build201-distinct-16viseme-likeness-review.glb`, verified file hash recorded in source register.
- Preserves all 16 named target slots: rest, sil, PP, FF, TH, DD, kk, CH, SS, nn, RR, aa, E, I, O, U.
- Reauthors deformation using jaw/lip spread, pucker, cavity width, teeth presentation, labiodental placement and differentiated protrusion, plus a new articulated tongue mesh.
- Maximum absolute off-diagonal head speech-morph directional cosine fell from approximately **1.00000** to **0.986858**. This is a *geometry separation metric*, not a natural-speech or facial-identity pass. Other facial and dental meshes still exhibit legitimate high similarity.
- Blends the user's original actual-photo features from the authorised white-polo foreground individual in `IMG_4824.jpeg` into the private face UV, while preserving `IMG_5711.jpeg` as the original reference. Three physical-camera views and sixteen actual morphed mesh renders were created, alongside an MP4 using **synthetic** calibration narration and actual glTF animation weights.
- The resulting face still differs substantially from the three owner-approved 2D portraits, especially cheek/jaw/profile and finished silver-gold armour construction. **No biometric/visual final approval or real approved spoken voice has been asserted.**

## Technical acceptance and next release gate

Passed: GLB bytes, glTF animation structures, six geometry-only colliders, 16 named facial states, audio+video calibration presence, model provenance SHA-256, mobile triangle equality and offline script checks.

Not passed: production physics engine / door trigger integration; actual portal spawn and destination bindings; actual iPhone/Watch navigation, FPS and memory; authentic bilateral head scan; organic 16-phoneme synchronisation against final approved speech; final owner acceptance of revised GLB; independent rights receipts; Apple-signed TestFlight.

**Verdict: approved originals retained; corrected assets are review candidates. Production loader and TestFlight gate are not changed.**

**Additional CAD spending: $0.**
