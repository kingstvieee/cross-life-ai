# STAAR Hub 1.0.3 (104): implementation and connection readiness

Build 103 succeeded and was uploaded to Apple at 05:27 America/Toronto on 2026-11-14. Its signed IPA includes the iPhone/iPad app and watchOS companion, both version 1.0.2 (103). It requires iOS/iPadOS 16.4+ and watchOS 10+. Native compilation and an Apple upload do not establish physical pairing, audio playback or microphone approval.

## New in candidate 104

- Every portal links to its own device/tool setup area, with the approved functional areas, explicit integration boundaries and an account-scoped local setup checklist.
- Home Assistant REST adapter: HTTPS origin validation, bearer token confined to the chosen server, native device secure storage scoped to the signed-in account, device-state readback, and explicit light on/off with a second readback after the service call. Locks, climate, covers, media and switches remain read-only. Unknown/unavailable devices are not controllable.
- Cancels home requests and clears readback when the app leaves the foreground. Connection failures clear prior displayed states. Disconnect removes the saved device credential. Credentials never enter chat, the STAAR backend, the Watch, or the repository.
- The production build profile explicitly sets the public backend origin. No provider secret is bundled.
- Device checks expose release configuration, actual OS microphone permission and voice-server readiness separately from listening approval.

## Portal matrix

| Portal | Available in candidate 104 | Connection boundary |
|---|---|---|
| Home | Home Assistant setup, device readback and light control; six home areas | Requires the user's existing trusted HTTPS Home Assistant server, token and installed integrations. Apple Home/Matter commissioning, autonomous routines and direct camera/door control are not implemented. |
| Work | Teams, Microsoft 365, Docs, LinkedIn handoffs; four work areas | Provider websites only. OAuth, file/calendar imports, jobs ingestion and team sync remain unfinished. |
| Dreams | Runway, Kling, Magnific, Veo, Luma, Leonardo, Pika handoffs; six creative areas | No generation job, credit spend or project sync is started by opening a tool. |
| Health | Ontario public-resource handoffs and setup areas | No medical records, Apple Health, clinical data or provider account is linked. |
| Love | Inclusive relationship and singles setup areas; 519 resource | No inferred orientation, contacts import or automatic messaging. |
| Village | Toronto events, TTC, GO, Volunteer Toronto and 519 handoffs | No bookings, live API feed or Community Pass issuance. |
| Closet | RSF/wardrobe/fit/shopping/beauty/orders setup areas | No invented RSF stock/prices, shopping account or working virtual try-on. |
| STARVERSE | Seven destination setup areas | Playable games and multiplayer are unfinished. |
| STAARSONIC | Suno, ElevenLabs, BandLab, FL Studio, Ableton, Logic, Pro Tools, LANDR, Moises and Splice handoffs | No streaming, DAW, stem library or audio hardware sync. |

## Blocking acceptance gates

1. Live `/api/companion/voice-preview/atlas` and `/kaia` returned 503 `companion_voice_not_configured` during the November 14 audit. The live backend requires secure `OPENAI_API_KEY` configuration. Do not put it in Expo public variables, GitHub source, or chat.
2. Actual iPhone: verify TestFlight version, sign-in, complete preview playback, deliberate microphone permission, transcript readback, cancellation and stop on background/navigation. Listening approval is deliberately session-specific.
3. Actual Watch: install companion, pair in Apple's Watch app, enable companion sharing in STAAR Hub, verify reachable state and a fresh Verify iPhone handshake. Confirm expiration/disconnection behaviour. No voice or holographic projection is promised on Watch.
4. Actual Home Assistant: verify rejected-token and offline behaviour, device discovery, a selected light command and physical state readback. Adapter unit tests do not certify the user's home network or devices.
5. Locked full 3D homepage/worlds, Guardian speaking rig/visemes, proactive background execution, cross-provider OAuth and the other unfinished capabilities above are not completed by this connection layer. The exact locked image masters remain preserved in source; images are not finished 3D environments.

## Verification

Home Assistant API reference inspected from the official repository: `home-assistant/developers.home-assistant`, `docs/api/rest.md`. Tests exercise HTTPS/credential validation, origin/header/signal handling, filtering, command-then-readback, arbitrary-service rejection, invalid responses and authentication/readback failures. The existing account storage tests verify isolation. Native prebuild compares actual generated target names against EAS signing metadata. Signed cloud build and physical device checks remain separate outcomes.
