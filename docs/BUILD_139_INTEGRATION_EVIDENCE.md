# Build 139 — integrated release-candidate evidence

Date: 2026-11-15
Owner: STAARWAARDD delivery
Review: Draft PR #79 against current canonical `main`
CI: Guardian Release Gates run #153, https://github.com/kingstvieee/cross-life-ai/actions/runs/43780760057

## Changes committed

1. All nine portal detail routes now offer an **opt-in offline Three.js preview**. Geometry is source-defined for Home, Work, Dreams, Health, Love, Village, Closet, STARVERSE and STAARSONIC. Native and web use isolated renderers. Navigation messages are allowlisted; no renderer can invoke a device command or third-party service. On WebGL errors or missing first-frame readiness (15 seconds), users get accessible portal navigation and manual retry.
2. Guardian Hub automatic greetings use account-specific local opt-in AND live authenticated Guardian server consent. Quiet mode, private mode, muted speech and protected mornings block unsolicited speech. A consent-controlled welcome may occur on app foreground return after at least 20 minutes away between 12:00 and 22:00 local time. This is **not** continuous speech while iOS suspends the application.
3. Read-only Google and Microsoft Calendar adapters are implemented with separate user authorization, PKCE/state, encrypted server token storage, configured HTTPS callbacks, one-use flows, status, on-demand upcoming-event read and disconnect. These are available in the Work portal only when authorized. The separate website shortcuts remain external links, **not API integrations**.
4. Generator/CI setup integrates `scene-src` into Expo packaging, and validates backend provider routes, scene build, frontend integration and account consent tests, TypeScript, web export and native iOS prebuild.

## Automated evidence

- GitHub Actions run #153: security-regressions and web-export **passed**.
- Provider API tests, frontend integration tests, account tests, WebGL bundle generation, TypeScript compiler, Expo web export and iOS prebuild steps reported success.
- No physical-device rendered frames, successful provider OAuth on a real account, final signed IPA, TestFlight installation or Apple Watch pairing was demonstrated by these results.

## Release-blocking creative and platform gates

- **Nine final immersive 3D worlds: NOT ACCEPTED.** Current Three.js scenes are a functional geometry preview. Visual fidelity to each approved locked source, textures/animations, performance on actual iPhone and correct spatial depth have not been independently approved. Never substitute generic scenes as the founder-locked final artwork.
- **Guardian facial animation: NOT COMPLETE.** The approved live identity face mesh, target-specific visemes, head/eye tracking and audio-to-mouth synchronization are not present as a verified production-ready asset. Do not generate or swap an unapproved Guardian.
- **Continuous proactive background speech: NOT COMPLETE.** Foreground greetings and native opt-in check-ins are distinct from a live, always-listening background voice session. iOS background execution, user permission, notification delivery and privacy must be separately designed and actually verified. Do not claim unrestricted background microphone use.
- **Third-party tool integrations: PARTIAL.** Home Assistant path exists; read-only Google/Microsoft Calendar OAuth routes are now coded but require live provider app registration and a connected account. Other named creative, media, home, health, work and shopping websites have **not** become authenticated providers merely through shortcuts.

## Required server configuration before provider claims

- `CONNECT_GOOGLE_CLIENT_ID`, `CONNECT_GOOGLE_CLIENT_SECRET`
- `CONNECT_MICROSOFT_CLIENT_ID`, `CONNECT_MICROSOFT_CLIENT_SECRET`
- `CONNECT_CALLBACK_ORIGIN` — registered public HTTPS backend origin
- `PROVIDER_TOKEN_ENCRYPTION_KEY` — private valid Fernet encryption key

Google and Microsoft calendar provider consoles must separately approve callback URIs `{CONNECT_CALLBACK_ORIGIN}/api/connections/google/callback` and `.../microsoft/callback`. Store secrets only in the backend environment, never in app source, GitHub or ChatGPT output. Confirm exact provider scopes, live authorization, event readback, refresh, disconnect, account isolation and revoked-token behaviour. No credentials are present or provisioned by this PR.

## Locked startup preservation

**DO NOT EDIT OR REPLACE THE EXISTING STARTUP VIDEO.** This branch does not change `frontend/assets/videos/guardian-startup.mp4` or startup playback wiring. World previews are separately navigated *after* the locked entrance.

## Release verdict

**CONDITIONAL DEVELOPMENT PASS / NOT FINAL.** Automated build/compile checks succeeded on run #153, but final cinematic visual identity, native proactive speech, scene approval, all direct provider authorizations, signed EAS artifact and actual device acceptance remain release blockers. Founder will perform the final TestFlight review after development is otherwise complete. No TestFlight submission or paid generation was performed.
