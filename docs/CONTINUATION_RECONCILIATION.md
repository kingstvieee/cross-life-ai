# STAAR Hub continuation checkpoint — 2026-11-13 Toronto

## Recovered state

The Open Cloud Browser conversation reports delivery of 1.0.1 (102), followed by
rejection of the signed-in seven-world crisis demo, blue styling, moving static
Guardian, missing music/game navigation, canned questions and device voices.
The source baseline is fix/atlas-kaia-native-continuity at 516ea6b. PR 23 is older;
do not merge it over the native identity/history work in PR 24.

## This continuation

- Root and /hub now use WorldHub: black/silver/chrome field, safe-area layout,
  nine immediately accessible approved portal images, settings and companion chat.
- No crisis demo activation, judge reset, ambience advertising, automatic fixture
  routine or moving Guardian photograph appears on the home route.
- Each /world/[id] opens three concrete preparation choices. A choice pre-fills a
  chat request; the user reviews and sends it. Music and games use general chat,
  preserving the seven existing permission domains. No streaming/game/device
  integration is invented. Closet has styling preparation, not a live catalogue.
- Guest list renders all nine worlds, includes the exact locked Atlas/Kaia pair,
  and offers both optional fixed AI voice introductions without account tools.
- Companion speech uses a server-owned OpenAI Speech API bridge with original
  British Atlas delivery and warm Kaia delivery. Dynamic speech requires an
  account; voice comes from the saved profile. Guest speech is fixed text only.
  Persona/model/instructions separate cache identities; private signed URLs retain
  the existing 10-minute expiry and no-store behavior.
- Quiet, master mute, companion switching and route cleanup cancel cloud playback
  and pending responses. A provider error stays visible; rejected system speech
  is not silently substituted. Natural speech remains optional; text still works.

## Voice deployment gate

OPENAI_API_KEY must be configured securely on the backend. No key was read,
created, copied into git or purchased in this continuation. The bridge has not
been live-listened or voice-approved. Original delivery instructions do not claim
an exact actor or celebrity voice. AI voice is identified in preview copy.

Official guide checked: https://developers.openai.com/api/docs/guides/text-to-speech
The guide states Speech API models shut down 2027-01-06. This bridge is temporary;
replace it with Realtime transport before then. gpt-realtime-2.1-mini cannot be
passed to /v1/audio/speech. Continuous listening, barge-in and animated visemes
are not implemented by this text-to-speech bridge.

## Verification and remaining work

Passed: 92 backend tests, 2 account-storage isolation tests, TypeScript, and combined web/iOS exports.
These checks validate source integration, not physical devices.
New synthesis tests use a fake HTTP provider and exercise real dispatch code.
No new TestFlight binary is claimed. Device layout, microphone speech recognition,
real-time interruption, audio quality, live Apple/email login, production identity
providers, clothes catalogue, game/music services, Watch pairing and animated
Guardian acceptance remain open. Keep PR draft until device/product acceptance.
