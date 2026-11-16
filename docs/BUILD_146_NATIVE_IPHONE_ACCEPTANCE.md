# Build 146 — Native iPhone acceptance runbook

**Status: NOT EXECUTED. No signed iPhone build or TestFlight install has been verified.**
This is a repeatable, no-production-mutation QA protocol; it does not claim a release.

## Preconditions
- Record git SHA, Expo version and iOS buildNumber from `frontend/app.json`.
- Record device model, iOS version, network, backend environment and tester.
- Obtain an authorized signed EAS build/TestFlight install and evidence ID; do not spend or submit without approval.
- Use test accounts and non-sensitive content. Never include authentication tokens or raw recordings in reports.

## Execute in order
1. **Launch and visuals**: cold start and warm start, record Guardian flight/arrival, Toronto skyline, nine distinct portals, bubble animation, tap target, portal navigation and reduced-motion variant. Compare each against founder-locked references; mark differences as defects.
2. **Consent**: Account A enable proactive greeting, restart; account B sign in and confirm greeting stays off until separately enabled. Mute, stop, disable master audio, revoke consent, restart. Verify no unsolicited voice after mute.
3. **Conversation continuity**: send text in Home, navigate Work, return Home; verify portal-specific history and no cross-account disclosure. Verify chat cancel, retry, background/foreground, lost network and expired login.
4. **Long messages**: submit 2,001, 4,001, 49,999 and 50,000 characters in an isolated test environment. Verify backend response and provider behaviour; verify 50,001 is blocked. Log response time, request cost in CAD, truncation and persistence. Stop on repeated errors or unexpected cost.
5. **Microphone**: deny and grant permissions; start, stop, cancel, revoke session, background while recording, background while transcribing, and return. Verify no upload after cancellation and no microphone use in background.
6. **Draft safety**: type a paragraph, dictate a second, verify transcript appends without replacing text; check newline, character count, send, retry and scroll.
7. **Voice**: record approved Guardian/Atlas/Kaia sample playback, accent and naturalness review, interrupt speech, cross-portal speech continuity and device silence switch behaviour.
8. **Reliability**: test low bandwidth, offline, app restart, two-account sign-out/in, permission revocation and repeated portal navigation; collect crashes and latency.
9. **Privacy/security**: ensure no private chat data appears after account switch; inspect telemetry for token/recording leaks; verify server auth, TLS and rate limits.
10. **Release evidence**: attach device video, logs with secrets redacted, results table, blocker list, rollback plan, signed build ID and founder sign-off.

## Defect classification
- **P0**: privacy breach, unauthorized recording/action, payment/security loss — immediate NO-GO.
- **P1**: crash, unusable login, voice ignoring mute, incorrect portal identity — NO-GO.
- **P2**: major visual mismatch, unreliable chat or microphone — NO-GO until founder explicitly resolves acceptance.
- **P3**: minor visual polish — may defer only with documented founder approval.

## Evidence template
| Test ID | Device / OS | App build ID | Git SHA | Expected | Actual | Evidence URL | Severity | Named owner | One completion task | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| N146-01 | TBD | TBD | TBD | Nine approved worlds | NOT TESTED | — | TBD | Unassigned | Execute and document native visual test | BLOCKED |

## Decision
**NO-GO** until every required test is run against a signed install, P0/P1/P2 defects are resolved or formally dispositioned as permitted, and founder approves. A GitHub CI pass alone is insufficient. No spend or deployment is authorized here.
