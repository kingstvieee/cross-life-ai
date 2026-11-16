# Build 138 — STAARWAARDD Hub release evidence gate

Status: **BLOCKED FOR NATIVE RELEASE**. Repository CI and merged PRs do not establish an iPhone release, a functioning proactive voice companion, or the locked visual acceptance criteria.

## Verified from repository configuration
- Expo app version: `1.0.4`; iOS buildNumber: `105` (see `frontend/app.json`). **Build 138 is a development milestone, not an iOS build number.**
- EAS production profile uses store distribution and `EXPO_PUBLIC_BACKEND_URL=https://cross-life-ai.emergent.host` (see `frontend/eas.json`).
- Background recording and playback are disabled in Expo audio configuration; hands-free/background Guardian cannot be claimed as delivered.
- The Guardian chat frontend and `ChatIn` backend validator permit 50,000 characters. Provider acceptance of 50,000-character messages is **not proven**.

## Release acceptance matrix

| ID | Acceptance requirement | Current evidence | Status | Single owner | Completion task |
|---|---|---|---|---|---|
| R138-01 | Locked nine-portal homepage: immersive animated liquid-glass worlds, approved imagery and Toronto skyline | Existing `world-hub.tsx`, portal rim animation; no approved device comparison | UNVERIFIED | Design/QA lead | Capture iPhone video and compare each portal to the locked reference; record defects and sign-off |
| R138-02 | Guardian flies into homepage, is lifelike and responsive rather than a static picture | Existing Guardian character/motion components; no native playback evidence | UNVERIFIED | Mobile engineering lead | Capture cold-launch iPhone playback, frame/interaction checks and crash logs |
| R138-03 | Proactive first greeting with consent, safe mute/private behaviour and no duplicate greeting | Opt-in preference and speech-state code; no end-to-end audio evidence | UNVERIFIED | Voice engineering lead | Test consent on/off, mute, restart, background, permission denial and duplicate prevention on device |
| R138-04 | Natural approved voices and cross-portal continuity | Audio provider and voice dock; no voice approval recording | UNVERIFIED | Voice engineering lead | Record approved voice samples and cross-portal conversation on device |
| R138-05 | Microphone transcription and permission/revocation races | Source guards and security CI; no iOS recording test | UNVERIFIED | Mobile QA lead | Test mic grant/deny, foreground/background, stop/cancel, transcription and privacy |
| R138-06 | 50,000-character input and server/provider end-to-end handling | Frontend/backend limits and repository CI | PARTIAL | Backend engineering lead | Submit authenticated 2,001, 4,001, 49,999, 50,000 and 50,001 character test cases; verify latency, provider token handling, rejection, history, cost and data retention |
| R138-07 | Login, session isolation, logout and private conversation history | Existing security regression CI; no complete release-device evidence | PARTIAL | Security/QA lead | Run two-account native-device isolation and privacy regression tests |
| R138-08 | Production backend and telemetry | Production backend URL configured; uptime, logs, privacy-safe observability unverified | UNVERIFIED | Backend operations lead | Verify TLS, auth, service health, timeouts, error telemetry and rollback |
| R138-09 | Signed iOS build and TestFlight acceptance | iOS buildNumber 105 in source; no EAS build artifact or TestFlight evidence attached | BLOCKED | Release engineering lead | Generate signed build under approved account, record EAS build ID, TestFlight processing, install, smoke test and rollback |
| R138-10 | Founder acceptance of locked visual/voice product | No recorded release sign-off | BLOCKED | Founder | Review evidence package and explicitly accept or reject release |

Owner labels above designate accountable **roles proposed for assignment**, not confirmed named people. Do not open execution commitments until an individual is assigned to each task. No spend, credential changes, store submission or production deployment is authorized by this document.

## Mandatory go/no-go rule

Release **GO** requires R138-01 through R138-10 to be VERIFIED, evidence linked by immutable build/commit ID, named owners recorded, no open critical/high-severity defects, and explicit founder release approval. Any missing evidence yields **NO-GO**.

## Required evidence bundle
1. Git SHA and PR checks.
2. EAS signed build ID, distribution profile, installed app version/build number.
3. Device matrix, iOS versions, network conditions and reproducible test scripts.
4. Screen recordings of homepage/portals, Guardian arrival, consent, voice and mic.
5. API and provider boundary results for 50k-character inputs with costs in CAD.
6. Security/privacy report, known defects, rollback plan and founder approval record.

**Current verdict: NO-GO for native production release.** Continue reversible implementation and verification; do not imply TestFlight delivery.
