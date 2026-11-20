# STAAR HUB Guardian — Build 251 release number reconciliation (2026-11-20)

**Current state: NO-GO for full production. Build number safety corrected without spending an Expo credit.**

## Live authenticated account observations
Read-only inspection of the owner-authorized Expo project
`staarwarddceos-team/stevieeedon` at
`https://expo.dev/accounts/staarwarddceos-team/projects/stevieeedon/builds`
on **20 November 2026**:
- Highest **issued internal iOS preview** observed: **1.0.4 (108)** (succeeded on Nov 18).
- Earlier internal previews: **107** and **106**.
- Highest observed **production App Store/TestFlight build**: **1.0.4 (105)**, separately submitted to Apple.
- This is an **Expo dashboard observation**, not independent proof of Apple installation or App Store approval.

The source branch had still specified **build 106** for both manual EAS workflows, `app.json`, signed IPA validator and tests, although 106, 107 and 108 already existed in Expo. Repeating it would risk a duplicate upload and waste scarce EAS capacity.

## Verified source adjustments
- Set `expo.ios.buildNumber` to **109** (marketing version 1.0.4 unchanged).
- Manual TestFlight release workflow, internal iPhone QA preview workflow, native signed-IPA verifier and source preflight are consistent with 109.
- `inspectProductionPackage` now enforces at least the higher of its caller's known build and the **108** authenticated Expo high-watermark. An obsolete TestFlight 105 argument can no longer incorrectly pass build 106.
- New regression tests cover issue 105–108 denial, build 109 number readiness, synchronized EAS/manual approval and hard fail-closed behavior without asset files.
- Before a real signing attempt, **refresh the Expo build ledger**; this high-watermark is a dated minimum, not a lifetime guarantee.

## NOT proven or released
The private Build250 Guardian cinematic GLB has still not received exact binary-specific final facial/armor approval and remains explicitly SHA-quarantined from the app. Ten world production assets + collision/rights receipts, locked media in the authenticated EAS archive, actual iPhone voice/locomotion QA, independently signed IPA evidence and final Apple upload are still pending. The preflight must **not** be bypassed by manually setting flags to true. No production signed build has been started in this change.

**Financial impact:** CAD $0 incremental; EAS credits used: **0**.
