# Companion continuation release checks

This change addresses native account entry, persona setup, scoped conversational
continuity, voice controls and the approved chrome portal previews. It preserves
the existing bundle, approved app icon, startup film and seven permission domains.

## Required server configuration

Use the existing identity broker described in GUARDIAN_ACCESS_RELEASE.md. Configure
Google, Microsoft and hosted email independently. Leave Apple disabled until its
broker connection handles Apple client-secret JWTs and verified userinfo. Set the native callback
to `frontend://auth-complete`. Set the Expo public backend origin to the real HTTPS
API. No secret belongs in the frontend or repository.

## Device acceptance

1. Create or resume an account through each configured provider. Cancel a login
   and retry. Confirm only enabled methods are interactive.
2. Complete email verification and password recovery at the hosted identity page.
3. Preview Atlas and Kaia, select one, save setup, and relaunch. Disconnect during
   profile saving: the UI must stay on setup with a useful error.
4. Have Kaia record a detail in Work, switch to Atlas, reopen the same conversation,
   and ask about it. Verify another account, another portal, and a changed privacy
   policy cannot retrieve it. Cross-life pause suppresses loading and storage.
5. Enable spoken replies; press Quiet during playback and while a reply is pending.
   Speech must stop; text chat and authorized task execution remain available.
6. Inspect all nine artwork previews and the seven existing functional destinations.
   Games and music must not imply that a new service or workflow has run.
7. Check iPhone and iPad layouts, reduced motion, large text and VoiceOver.

## Explicit remaining gates

- Live identity broker/database/backend configuration and end-to-end provider tests.
- Signed native binary with a new build number, then TestFlight installation.
- Studio voice/character-portrait acceptance, speech recognition and interruptible
  live conversation, foreground proactive events and background notifications.
- Separate watchOS companion app, pairing, shared-session transport and real watch tests.
- Physical NFC/presence/camera/device control and independently observed readback.
- Production worker enrollment, queue/keys/audit and original 20-minute app-stack proof.

Source/runtime checks are useful evidence for this patch; they do not close these
device and production gates. No hardware purchase or provider spend was made.

## Turn boundary

The non-streaming route delegates to the independently importable chat_turn
module and uses the saved account companion with GPT-5.2. Existing account rate
limits and portal authorization remain in place. Effective policy and account
identity are rechecked before model dispatch and after the response; changed
context, empty replies and provider errors do not save history. Tests import the
module directly instead of compiling production function bodies from the AST.
New broker accounts default to Atlas; re-presented onboarding preserves an
existing Guardian choice and offers an explicit keep-current card.
