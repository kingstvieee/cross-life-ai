# STAARWAARDD — Builds 145–149 evidence and release gates

Compiled from approved repository requirements. This is a delivery ledger, **not final product certification**.

## Locked invariants
- Do not touch or replace `frontend/assets/videos/guardian-startup.mp4`, SHA256 `1c8dce7f7b5f18e9ae580ec14910a0e20939cb8b52ec43897a08d2ecaa98886c`.
- Guardian face geometry, haircut, tattoo, suit and approved identity cannot change; an unapproved generic face or guessed lip movements may not substitute for the locked rig.
- All nine worlds are separate identities from `docs/LOCKED_PORTAL_REGISTER.md`. No static illustration or Three.js geometry-only preview is accepted as final immersive art.
- Third-party provider labels must accurately distinguish OAuth/API action, unsupported tool, and website shortcut.
- Signed native iOS and TestFlight processing require real Apple/EAS evidence; Expo prebuild is not release submission.

## Delivered technical code in this branch
| Milestone | Implemented | Acceptance gate not yet satisfied |
|---|---|---|
| 145 Guardian facial pipeline | Validated typed 16-shape viseme timeline, sorted timings, weights, asset SHA identity gate and source-level tests | No approved Guardian blendshape rig or source TTS phoneme timestamps exists; **lip sync not complete** |
| 146 Nine immersive worlds | Nine specific locked identities, distinct Love variants, strict 9/9 independent art/animation/device approval validator and tests | Geometry previews remain; signed reference proof and actual approved textured worlds/captures are **not complete** |
| 147 Proactive native check-ins | Native `UNUserNotificationCenter` authorization vs scheduled status, React UI warnings and pure test cases | Actual iPhone delivery and Watch pairing not verified; OS reminders do not run live microphone or unattended narration |
| 148 Direct auth availability | Trust allowlist for Apple, Google, Microsoft, Yahoo, email; backend provider configuration gate and guest/error fallback plus tests | Real provider registrations, callback/credentials and device session restoration not yet verified for every option |
| 149 Integrated release gate | CI tests for 145–148, all-nine integrity, and original startup video byte-count/hash | CI, physical iPhone/Watch use, signed IPA, privacy/device readback and TestFlight still require proof |

## Combined inherited development
The branch contains candidate code from PRs #79, #84, #88, #90, #91 and #93: offline Three.js previews with recovery, foreground consent-checked Guardian speech state tied to playback, and read-only Google/Microsoft Calendar OAuth with encrypted tokens, verified readback and revoked-token handling. This is not permission to claim those providers are connected on a real account.

## Current verdict
**CODE DELIVERY: COMMITTED. FINAL RELEASE: BLOCKED.** No validated approved facial mesh; no 9/9 founder-approved 3D worlds; no all-provider live integration evidence; no background iOS speech equivalent to unrestricted always-on microphone; no signed candidate and TestFlight installation from this branch. Stay in draft and do not spend or release without explicit founder approval.
