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

## Verified follow-up (2026-11-22)
- Clean exported checkout of `fix/locked-hub-home` at `c9d7dc0d20ce6e426eedf42211fcdb5898057fdf`: `node --test tests/build111-immersive-hub-home-contract.test.mjs tests/guardian-audio-visual.test.mjs tests/mainline-reconciliation.test.mjs` completed **11/11 passing**. These are static/targeted tests, **not** device certification.
- `fix/locked-hub-home` is **3 commits ahead** of this reconciliation branch (GitHub comparison); bring forward the newest Guardian voice/focus work before integration.
- `frontend/components/staarwardd/world-hub.tsx` on Claude branch uses `WorldScene`, `lockedPortalArtwork`, safe-area insets, and portal preview. Main uses an older `GuardianCharacter`/ScrollView layout. Preserve Claude's component, then selectively port required mainline changes.
- The Codemagic workflow on Claude branch is named `staar-home-review-115` and pins build 115, while `main` uses `staar-testflight-110` and protected `staar-private-110` group. Neither is a valid next-build workflow as-is.
- Apple TestFlight listed build 115 in the internal Team (Expo) group, but the owner reports that its layout is not functional. Do not treat upload/install metrics as acceptance.

### Next merge gates
- Integrate the 3 newer Claude commits without overwriting this report; reconcile mainline deltas through reviewed selective commits, not a wholesale merge.
- Confirm the replacement build number is unused and ensure Codemagic includes private asset decryption and real bundle checks.
- Verify the replacement on the iPhone after the redesigned Hub is visible; no new build until the above preflight is green.

## Expanded clean-checkout test gate — BLOCKED
- Current `fix/locked-hub-home` commit `e8f63a5` **is already an ancestor** of reconciliation branch `b17050a`; the previously reported three missing Claude commits are already incorporated. Do not duplicate them.
- On a clean `git archive` of reconciliation branch, running the 5 relevant suites (`ten-portal-home-contract`, `guardian-audio-visual`, `build252-private-b250-iphone-qa-loader`, `build252-private-preview-archive-policy`, `build111-immersive-hub-home-contract`) produced **22 tests, 16 pass, 6 fail**.
- Failed tests: `The signed-in homepage contains ten direct portals and a Guardian-only scene`; `Private rig presentation is restricted to explicitly staged native review builds`; `Guardian avatar speaking state follows actual voice, not speech requests`; `ten distinct portals are ordered and navigable`; `signed TestFlight workflow does not stage the unapproved B250 QA Guardian`; `locked Home is the guest entry on every platform and private routes stay gated`.
- Current reconciliation `codemagic.yaml` preflight uses private **B250 QA** staging. This must not be confused with user-approved final production Guardian. Do not run workflow until a genuinely approved model is proven and failing contracts are resolved.
- The earlier 11/11 passing result covered only three narrower suites on the Claude source branch, and does not supersede these expanded failures.
- **Release gate FAIL; no signed replacement build authorized by test evidence.**
