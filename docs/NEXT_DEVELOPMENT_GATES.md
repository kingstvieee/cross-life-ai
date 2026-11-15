# Remaining development — implementation checkpoint, 2026-11-15

This branch is not a completed release and must not be described as one. Existing
TestFlight 1.0.3 (104) does not include these changes. No new build has been queued.

## Implemented here

- Native iOS local daily check-in notification through UNUserNotificationCenter.
  Explicit permission and chosen local time, disable control, neutral lock-screen
  text, account-transition/cold-launch cancellation. No microphone activation,
  location monitoring, scheduled model call or unattended external action.
- Read-only Google Calendar and Microsoft Calendar authorization-code/PKCE flows.
  Per-account encrypted server token vault, ten-minute single-use consent state,
  deliberate authenticated finish, refresh-token renewal, seven-day/25-event
  readback on request, disconnect and credential removal. No account bearer or
  provider tokens in browser authorization URLs or client storage. No provider
  events are automatically added to chat, memory or Watch context.
- Connection UI inside Work, with separate unconfigured/consent/connected states.
  Closing/backgrounding cancels reads and clears displayed event data.

## Deployment configuration required

Set only on the backend, never Expo public variables, source or chat:

- `PROVIDER_TOKEN_ENCRYPTION_KEY`: persistent Fernet encryption key. Generate
  privately in the deployment runtime, retain securely for existing connections;
  replacing it without migration makes stored tokens unreadable.
- `CONNECT_CALLBACK_ORIGIN`: `https://cross-life-ai.emergent.host`
- `CONNECT_GOOGLE_CLIENT_ID` / `CONNECT_GOOGLE_CLIENT_SECRET`
- `CONNECT_MICROSOFT_CLIENT_ID` / `CONNECT_MICROSOFT_CLIENT_SECRET`

Register exact redirects with their respective provider apps:

- `https://cross-life-ai.emergent.host/api/connections/google/callback`
- `https://cross-life-ai.emergent.host/api/connections/microsoft/callback`

Google requires Calendar API and the scope
`https://www.googleapis.com/auth/calendar.events.readonly`. Microsoft requires
delegated `Calendars.ReadBasic` and `offline_access`. Existing STAAR sign-in broker
settings are separate and do not establish consent for calendars. Provider app
ownership/verification/tenant policies and user consent are external gates.

## Unfinished visual/runtime requirements

The repository contains locked PNGs and Guardian MP4s/pose PNGs but no GLB, GLTF,
FBX, VRM, USDZ or Blend production models. A focused Library search returned
image/video production references rather than those model files. The locked
facial identity cannot be preserved by substituting a generic avatar. Required
production source assets are:

1. Approved Guardian character mesh, skeleton, skin weights, eyes/teeth, facial
   blendshapes/visemes, locked face/hair/suit materials, and animation clips.
2. Approved nine navigable portal scenes with camera bounds, collision/navigation,
   lighting/materials, exact landmarks, interactive object IDs and mobile LODs.
3. Asset-specific visual review and actual iPhone/Watch native execution evidence.

Neither waving a PNG nor looping the hover MP4 establishes speech animation or
an interactive 3D environment. These remain release blockers, not hidden fallback
features. Apple may suspend the app; a local check-in notification does not mean
always-on wake-word recording or arbitrary background execution.

Other listed creative/music/social providers remain website handoffs until a
supported API adapter, provider authorization and readback have been implemented.
Home Assistant remains the existing explicit readback/light-control adapter.

## Validation boundary

Backend security tests cover consent replay, provider binding, expiration, denied
consent, cross-account access, encrypted storage/integrity, HTTPS callbacks,
read-only scopes, field minimization and disconnect. TypeScript and web export
are checked separately. Native notification compilation and delivery require a
signed iOS build. Provider integration tests use isolated mock provider responses;
they are not evidence of a real Google/Microsoft account connection.
