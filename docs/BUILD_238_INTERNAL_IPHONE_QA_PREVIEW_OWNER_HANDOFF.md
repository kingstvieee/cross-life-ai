# STAARWAARDD — Internal iPhone QA preview, owner-controlled release procedure

**Prepared:** 2026-11-17 (Toronto). **Current source:** Build 238 merged commit `03cd2737f345635bea4cf080844863c4412941d2` plus the manual preview workflow in this change.

## What has been prepared

- `frontend/.eas/workflows/iphone-qa-preview.yml`: a **manually triggered** Expo EAS Workflow. It runs read-only `verify-internal-iphone-qa-preview.mjs` first, then **pauses at a founder/owner approval step** before any EAS internal iOS build. On approval it requests **platform iOS, profile preview**, refreshes managed ad hoc provisioning for previously registered devices and never invokes `submit` or TestFlight.
- `frontend/scripts/verify-internal-iphone-qa-preview.mjs`: checks exact locked EAS project/team, bundle ID, app version `1.0.4 (106)`, Watch target, internal preview distribution, preview-only QA UI flags, the production QA-off policy, approved Guardian face reference and private ten-world review-only asset exclusion. It produces machine-readable `sourceReadyForOwnerBuildApproval`. It **does not check credentials or certify a signed archive**.
- `frontend/tests/iphone-qa-preview-workflow.test.mjs`: negative tests for altered Apple identity, a downgraded build number, mistakenly enabled QA in production, missing scene controls, missing approved-face references and missing 3D-world quarantine.

## Important: what is NOT yet available

The connected browser workspaces currently expose **no authenticated Expo or App Store Connect account** for this action. The source and Apple identifiers alone cannot create an IPA. User login, EAS project access, available build capacity, Apple signing credentials, ad hoc provisioning/device registration and price eligibility cannot be inferred from a passing CI check.

No new EAS build, iOS signature, TestFlight submission or real iPhone test was performed by adding this workflow.

## How to authorize the internal iPhone QA build

1. Sign in to the **existing** STAARWAARDD Expo account: `staarwarddceos-team`, linked EAS project `d3485a8e-6746-4383-999e-0907fc4d86a7`. Do **not** create another Expo project or change the Apple bundle identifier.
2. Before approving a build, inspect Expo's current EAS quota/credits and charges. **A code preflight cannot guarantee a CAD $0 cloud build.** No paid generation or subscription is authorized by this repository change.
3. Verify the test iPhone's UDID is enrolled on Apple Team `R9BPDSU4BW`. If absent, register on the actual iPhone via `eas device:create` and its device-signup website, using the Apple team's trusted enrollment flow. Keep UDID and Apple credentials out of the chat and public GitHub.
4. In authenticated Expo, run `.eas/workflows/iphone-qa-preview.yml` manually. Select `1.0.4 (106) - INTERNAL IPHONE QA ONLY`. Review the source preflight and approve the **owner_build_approval** gate **only after** build pricing and credential/device status are confirmed.
5. EAS may produce an ad hoc-signed iOS install link once the build succeeds. Record real `build_id`, actual completed status, verified project ID, IPA hash, signer/team and device-install result. A workflow-started URL does **not** equal a complete signed IPA.
6. Install on the authorized iPhone. The preview profile enables `EXPO_PUBLIC_GUARDIAN_DEVICE_QA=1` and `EXPO_PUBLIC_WORLD_COLLISION_QA=1`; production keeps both `0`.

## On-device QA capture (zero invented passes)

In Guardian Hub, use **Idle / Walk / Run** and check whether each is accepted. Missing final-approved full-body GLB should show a rejection, not a fake animation. Capture frame QA, speak through an authenticated real playback flow and export local metrics. Record frame p50/p95, valid model SHA, the actual count of received/accepted audio frames, 16-target mouth behavior and app crashes. Independently observe audio/video sync with an external recording before finalizing facial motion.

Visit each independently loaded world and record one collision capture: Home, Work, Creativity, Wellbeing, Relationships Realm, Relationships Singles, Events Village, Style Closet, Staarverse Universe, Staarsonic Studio. Test ground support, deliberate blocked-wall contact, actual portal endpoints, walk/run and sustained performance. Tap **Export all worlds** only after all reports are ready. Each captured world is still `UNVERIFIED` until independent review. It is currently valid to receive `NO_APPROVED_ASSET` when the private final world GLBs are not installed.

Suggested engineering review targets (not measured results):
- Guardian and world scenes: **at least 30 FPS sustained** during the representative capture, with frame p95 and thermal state documented.
- The capture should represent at least **300 rendered frames** where a certified asset is actually loaded.
- Ten-world target is **10/10 physical device walkthroughs** with correct portal/floor behavior; current progress is **0/10 certified**.
- Every world needs its actual final 3D model, owner signoff, licensed asset evidence and a verified device-collision receipt; offline fixture data does not substitute.

## Release gate

A successful private preview is **not production TestFlight acceptance**. Production still requires independent Guardian likeness/rig approval, ten-world releases, independent StarCenttinel recovery and revocation attestation, sound/film source integrity, inspected private EAS archive, Apple-signed IPA, App Store Connect upload receipt and founder acceptance.

**Direct spend for implementing the manual preview workflow:** CAD $0. **Cost of a future Expo cloud build:** not verified; must be checked before the owner approval step.