# STAARWAARDD post-115 reconciliation gate

Status: WORK IN PROGRESS — no release approval.

## Baseline
- Preserve Claude's redesigned `frontend/components/staarwardd/world-hub.tsx` from `fix/locked-hub-home` as the layout baseline. Do not replace it with `main`'s older `GuardianCharacter` / ScrollView hub.
- Preserve the redesigned `frontend/scene-src/worlds.js` Guardian presentation and reduced-motion behavior.
- Keep build 115 as a failed functional reference, not a release candidate.

## Confirmed conflicts (2026-11-22)
- `main` and `fix/locked-hub-home` diverged (81 behind / 91 ahead when comparing the redesign against main).
- The two branches have materially different `world-hub.tsx`, `worlds.js`, and `codemagic.yaml` implementations.
- The redesigned branch's Codemagic workflow is hardcoded to build 115 and lacks the `staar-private-110` environment group; do not rerun it as the replacement release.
- `main`'s private-asset workflow is hardcoded to 110; do not copy it wholesale into the redesigned branch.

## Required reconciliation
1. Preserve redesigned hub markup, 10 portal interactions, safe-area layout, accessibility and sign-in behavior.
2. Audit main-only Guardian, authentication, privacy, audio, navigation, scene and test fixes; selectively port compatible changes with focused diffs.
3. Integrate the authenticated private asset preflight and fail-closed Guardian/world validation without embedding keys or bypassing QA-only restrictions.
4. Introduce a fresh internal-only Codemagic workflow targeting an unused iOS build number above 115, verified against App Store Connect; no automatic build triggers.
5. Run clean dependency installation, runtime generation, unit/integration checks and native archive validation.
6. Verify redesigned hub, Guardian identity, ten portals, startup sound and login on a physical iPhone; require explicit sign-off before production approval.

## Release blockers
- No validated merged runtime or fresh signed IPA.
- Approved private Guardian model and world assets not certified in the replacement build.
- Apple-side next build number and device-level functionality not yet confirmed.

Do not merge into main or trigger Codemagic until the above gates pass.
