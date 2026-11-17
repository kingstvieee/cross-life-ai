# Build 211 — Private EAS Upload-Integrity Preflight

**Status:** Source-level release validation. **Additional direct spend:** CAD $0. **Target:** Existing STAAR Hub 1.0.4 (iOS build 106).

## Why this was necessary
Build 209 recovered and hash-verified the exact founder-approved startup recording `Starward Guardian(2).m4a`, reconstructed its approved iOS AAC derivative byte-for-byte, and prepared a private EAS staging ZIP. The repository's Build 181 preflight verifies the local AAC and Metro native alias, but did not verify that the generated **Git-root** `.easignore` includes both otherwise Git-ignored private audio files. A private checkout could therefore pass the approved-audio file check while submitting an incomplete EAS upload archive.

## Installed gate
- `verifyPrivateEasUploadRules` recomputes the exact generated `.easignore` from both Git-root and frontend `.gitignore` and refuses a missing, changed or unexpected inclusion policy.
- `inspectProductionPackage` enforces the EAS upload-rule check when, and only when, it has positively verified the exact approved AAC bytes **and** the native Metro source alias.
- Added regression tests for missing rules, exact canonical rules, unrelated un-ignored secret additions, and the presence of the signed-build fail-closed gate.
- The actual private soundtrack remains outside the Git repository. No changes to the approved startup film, soundtrack, visual references, GLBs, release identities, founder approval or TestFlight upload procedure.

## Proof boundary
**PASS, once CI is green:** deterministic local EAS upload rules validate byte-for-byte against a canonical policy. This reduces the risk that exact private audio is silently excluded from the archive.

**NOT TESTED:** an authenticated EAS cloud upload, the actual `eas build:inspect` output, a signed .ipa, iPhone/iPad/Watch playback, live provider connectivity, independent StarCenttinel recovery or true final facial likeness. A build must not be submitted until the separate actual archive inspector, device tests and owner release acceptance are satisfied.

## Owner-controlled preparation
1. In a PRIVATE checkout of the verified Git main branch, stage the actual approved AAC from Build 209 using the existing SHA-checking `stage-approved-startup-audio.mjs`.
2. Generate canonical private upload rules using `prepare-private-eas-archive.mjs prepare`.
3. Run `verify-production-package.mjs`. It still fails if final identity-approved Guardian GLB, all ten independently accepted worlds and release receipts are missing.
4. Independently run `eas build:inspect` and `prepare-private-eas-archive.mjs inspect <directory>` before requesting a signed build.
5. Only use the EAS founder-controlled signed workflow once all accepted assets and rights/device evidence have been verified.

The locked Build 201 Guardian model is an improvement in structural lip-shape separation but **still fails facial likeness**. It is not allowed to clear that release blocker.
