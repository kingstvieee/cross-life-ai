# Build 203 — Rejected Guardian likeness is fail-closed in app and asset import

Date: 2026-11-16
Branch: `guardian/build-203-rejected-likeness-release-gate`
Base: `release/build-175-180-model-and-world-gates`

## Implemented
- Preserve locked silver/gold armour, original soundtrack/intro, Build 189 portrait sources and Build 202 approved *cinematic direction*.
- Reject known failed Build 202 textured GLB (SHA-256 `847c2f412b0184a372cd8a6a9149b78fcfe33a7e3127297196a80611f5e0f50d`) in BOTH independent asset packaging (`validateArmoredGuardianGlb`) and native runtime activation (`canActivateArmoredGuardian3D`).
- Do not allow a fabricated all-true receipt to override the documented negative visual review. Preserve existing evidence ledger and 16-viseme gates.
- Add node tests that synchronize negative hash with the actual approved Build 202 reference register. No biometric images or private model files committed.

## Explicitly NOT satisfied by this change
- Accurate new scanned/retopologized 3D Guardian face, UV seam elimination, faithful true side profile and actual final viseme-sync approval.
- Ten individually final-approved world binaries and real engine physics/trigger QA.
- Verified live OAuth/service connections and independent deployed StarCenttinel control plane.
- iPhone/Watch hands-on tests, Apple signing, TestFlight upload or founder release acceptance.

## Release instructions
1. Run the existing Guardian Release Gates CI; new tests must pass.
2. Inspect private true-face reconstruction against approved reference and real bilateral capture.
3. Attach exact asset hashes, independent rights and device evidence. Acceptance belongs to an owner-signed private record, not a CI boolean.
4. Keep the release candidate withheld until each `frontend/src/release-readiness.ts` release gate has real evidence.
5. Integrate latest release branch into `main` only via a reviewed PR because the branches have diverged; never force-update `main` or automatically release a signed app.

Direct spend: CAD $0. Status: source fix submitted for CI review; NOT a production release.
