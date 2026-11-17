# STAARWAARDD Build 238 — iPhone QA Controls (internal builds only)

**Status:** Feature implementation and automated code checks are separate from physical iPhone test execution. The native QA control implementation can be merged without promoting any unapproved 3D artwork or pretending it was run on a phone.

## What the internal QA operator sees

### Guardian hub
- Internal Expo `development` and `preview` builds on iOS expose the **Guardian Device QA** panel. Normal production builds explicitly set `EXPO_PUBLIC_GUARDIAN_DEVICE_QA=0`.
- Test buttons: **Idle**, **Walk**, **Run**. Each sends a session-bound renderer command and displays its actual accept/reject acknowledgement. A missing final approved Guardian GLB yields an explicit rejected status.
- **Capture frame QA** requests measured renderer FPS, frame intervals, model SHA, speech cue packet counts and observed viseme names. No microphone, face photos, private audio clips or credentials are exported.
- **Export QA** opens the local iOS Share sheet only after a strictly bounded, whitelisted renderer report has been received.
- Exported files are explicitly tagged `certification: UNVERIFIED`, `physicalIphoneOwnerAttestation: false`, and either `NO_APPROVED_ASSET`, `INSUFFICIENT_SAMPLES`, or `REVIEW_REQUIRED`. `REVIEW_REQUIRED` is **not** a pass.

### Ten world portals
- Every non-hub world in internal iOS builds exposes **Capture world QA**, **Export world QA**, **Export all worlds**, and **Clear results** (the latter requires device confirmation).
- Capture collects movement events, obstacle contact counts, actual scene triangle counts, frame metrics, route-preflight state and asset SHA when an approved world has actually loaded.
- Each **manual** capture stores a sanitized local-only report in `@react-native-async-storage/async-storage` for the corresponding one of ten expected environment/variant IDs: home-residence, work-command, creativity-dream, wellbeing-health, relationships-realm, relationships-singles, events-village, style-closet, staarverse-universe and staarsonic-studio.
- Progress shows **0/10–10/10 diagnostics captured**, not world certifications. A capture without an approved world explicitly records `NO_APPROVED_ASSET`. Exports preserve a count of missing world captures and independently non-certified GLBs.
- The ten-world bundle is shared **only after the operator taps Export all worlds**. No background uploads or automatic buyer/provider handoff occurs.
- Clear results removes only local QA reports, after an explicit confirmation. Session changes clear unsaved snapshots so stale reports cannot be exported as the next scene.

## Reliability and release safeguards
- A WebView renderer message is **untrusted** even when its session matches. The native boundary uses a single telemetry whitelist, known schemas, bounded numbers, SHA-256 verification and fixed false certification fields. Arbitrary keys, credentials, binary media and forged device acceptance are ignored or rejected.
- The proof threshold for a **review candidate** is intentionally modest (Guardian 300 frames and at least one accepted speech packet; world 300 frames, 20 movement ticks, valid route preflight and no context loss). It never grants production permission.
- The existing Build 228 face approval, review-only GLB hash exclusions, StarCenttinel security fail-closed controls, ten-world floor gating and original soundtrack remain untouched.
- Actual real-iPhone/Watch measured acceptance, professionally judged body/face animation, portal endpoints, live security credentials, final artist rights, inspected Expo archive, Apple signed IPA, TestFlight upload and founder signoff **remain separate**. A passing GitHub check cannot satisfy them.

## How to run on an authorized iPhone
1. Use authenticated Expo EAS to create an **internal iOS preview build** from the current approved source (no production submission).
2. Install on an authorized registered device.
3. On Guardian Hub, exercise Idle/Walk/Run and capture/export after a real, independently approved GLB and session have loaded.
4. Visit all ten world variations, perform walk/run and deliberate wall/floor tests, then capture each world and export the combined local bundle.
5. Validate the SHA, signed bundle and device identity and independently review native frame rate, collisions, speech offset, floor support and owner visual acceptance before any status can change from NO-GO.

**Evidence not present at coding stage:** No physical-device runtime capture, signed distribution IPA, accepted world GLB installation, or TestFlight receipt. **New direct generation spend:** CAD $0.
