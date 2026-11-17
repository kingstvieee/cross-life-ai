# Build 224 — Block visually rejected Build 222 private GLB
Date: 2026-11-17. Production gate verdict: **NO-GO**.

Private model: `STAAR_Guardian_Build222_NEW_16Viseme_3D_Likeness_Candidate_NOT_APPROVED.glb`
SHA-256: `325bc975ccae49db54e5c5ac761a229d7b66930663cb68f5ff5844a507771a36`.

A newly re-sculpted 5,842,592-byte source GLB was independently loaded/rendered and has 10,285 head vertices, a preserved original full silver/gold armoured body and skin, three animation clips and all 16 named visemes. Structural 14/14 speaking shape QA passed.

**But real four-view visual review FAILED**: egg-shaped profile/skull, unfaithful nose/jaw silhouette and visible photo projection seams. It does not match the founder-locked 3D Guardian likeness; it is quarantined private material, NOT production, NOT accepted and cannot be submitted to EAS regardless of generic true-sounding attestations.

This change blocks the exact model SHA-256 in:
- Build-time GLB importer, before a production receipt can authorize it.
- Native runtime facial-armour activation even if all approval booleans are true.
- Regression tests for both routes.

Owner's previously approved *appearance direction* does not approve this file. A truly final model must be a **new separately reviewed and hashed binary**, plus real physical iPhone measured facial/audio proof. No private image/model/song bytes are committed to GitHub and no paid 3D generation credits were used.
