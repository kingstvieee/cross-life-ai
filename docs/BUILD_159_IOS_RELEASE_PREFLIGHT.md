# Build 159 — iOS Release Preflight (Evidence Gate)

**Verdict: BLOCKED / NO-GO.** This preflight is a repository configuration inspection, not an EAS build, Apple signing validation, TestFlight installation, or acceptance test.

## Verified configuration (repository main at preflight)
| Control | Evidence | Finding |
|---|---|---|
| Expo app version | `frontend/app.json` | `1.0.4` |
| iOS build number | `frontend/app.json` | `105` (distinct from internal development milestone 159) |
| Bundle ID | `frontend/app.json` | `com.emergent.crosslifeai.z79271` |
| Apple team | `frontend/app.json` | `R9BPDSU4BW` configured; signing authority not verified |
| EAS project | `frontend/app.json` | `d3485a8e-6746-4383-999e-0907fc4d86a7` configured; account access not verified |
| EAS owner | `frontend/app.json` | `staarwarddceos-team`; owner control not verified |
| EAS production | `frontend/eas.json` | store distribution, physical iOS device target |
| Production backend | `frontend/eas.json` | `https://cross-life-ai.emergent.host` configured; service availability, TLS, API and privacy not tested |
| App Store Connect app | `frontend/eas.json` | `6834467523` configured; app ownership/access not verified |
| Microphone | `frontend/app.json` | permission explanation present; background recording disabled |
| Background audio | `frontend/app.json` | background playback disabled |
| Dependencies | `frontend/package.json` | Expo 57, React Native 0.86.3; native build compatibility unverified |
| Native QA | `docs/BUILD_146_NATIVE_IPHONE_ACCEPTANCE.md` | Test protocol exists; no executed device evidence |

## Blocking gates and accountable completion tasks
| Gate | Owner | Exactly one completion task | Required evidence |
|---|---|---|---|
| G159-01 Apple authority | Founder / Apple account owner (named assignee pending) | Confirm Apple Developer team and App Store Connect app are under authorized control | Redacted account/team confirmation |
| G159-02 EAS authority | EAS project owner (named assignee pending) | Confirm EAS project access and credentials for the intended build profile | Redacted access and credentials status |
| G159-03 Build identity | iOS release engineer (named assignee pending) | Determine next valid unique Apple buildNumber and version policy without changing it prematurely | App Store Connect build history and signed-off version |
| G159-04 Backend | Backend owner (named assignee pending) | Validate production URL, authenticated API routes, TLS and safe failure modes | Timestamped redacted smoke-test results |
| G159-05 Signing and costs | Founder / Approver (named assignee pending) | Approve exact EAS build profile, any CAD cost cap and signing/submission scope | Written approval ID and cost estimate |
| G159-06 Signed artifact | iOS release engineer (named assignee pending) | Produce a signed build after gates 01–05 clear | EAS build ID, artifact fingerprint and build logs |
| G159-07 Native acceptance | Independent QA reviewer (named assignee pending) | Execute Build 146 acceptance matrix on an authorized iPhone install | Device/OS, videos, redacted logs, defect ledger |
| G159-08 Release decision | Founder / Approver (named assignee pending) | Sign off on acceptance results and release/no-go decision | Explicit decision with build ID |

No gate is considered complete from repository configuration alone. Role labels above are provisional; assign exactly one named person to each task before execution.

## Safe execution path
1. Verify Apple Developer and EAS project ownership using authenticated account access.
2. Check current App Store Connect build number and select a unique next number; do not assume 159.
3. Check backend readiness and test-account isolation without exposing credentials.
4. Obtain approval for any cloud build, signing, or distribution action and its CAD cost cap.
5. Build with a deliberate EAS profile; do not run `eas submit` or modify production without explicit authorization.
6. Run `docs/BUILD_146_NATIVE_IPHONE_ACCEPTANCE.md` on a physical iPhone.
7. Release only after all blockers clear and founder signs off.

## What this preflight does not prove
- Realistic Guardian speech, lip sync or hands-free conversation
- Locked homepage visual fidelity or nine complete portal interiors
- Apple signing validity, successful native compilation, TestFlight availability or device behaviour
- A working production backend or full 50,000-character provider acceptance

**No build, submission, credential mutation, production change or paid service is authorized by this document.**
