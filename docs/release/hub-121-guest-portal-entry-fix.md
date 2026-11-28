# STAAR Hub 121: portal entry correction

## Device symptom and source diagnosis

The owner's iPhone showed STAAR Health focused in the 3D ring, then the sign-in sheet and Auth0's **Callback URL mismatch**. These are separate issues:

- On the exact 121 source, a guest using the native world list was sent straight to sign-in. A guest tapping the 3D ring was offered an artwork modal whose entry button also went to sign-in. The authenticated router was deliberately not mounted for guests. Consequently, although the ring responded, no guest choice could open a destination.
- The ring previously treated a first tap on a visible off-centre card as focus only, requiring a second aligned tap to enter.
- Auth0 rejected the sign-in redirect independently. This source change neither changes identity configuration nor bypasses authentication.

## Fix

- The ring, native All worlds list, and non-WebGL navigation feed the same approved ten-destination selection. One intentional hit on a visible portal card requests entry; drag and pinch guards remain.
- Signed-in members keep the native immersive destination route. Guests can visit the correct local, read-only experience with its artwork. The authenticated stack remains unmounted, no tool buttons or commands can be dispatched from guest scenes, and the guest renderer HTML excludes protected Guardian/world assets. Guest scenes cannot start Guardian audio or iPhone QA.
- Guests use a clearly separate **Sign in for tools** action. Only after successful authentication/onboarding and router readiness does it resume that known local portal. A cancelled sign-in does not leave a pending destination.
- No changes to asset binaries, release/signing settings, or provider configuration. A local scene is not evidence that a released interior or tool integration has been certified.

## Device acceptance checklist

1. Open from TestFlight without a session. From the locked Home, open STAAR Health from the ring and DIGGITSTAAR from All worlds. Both open distinct guest previews locally even if sign-in is unavailable. Confirm Back to worlds returns to the locked Home.
2. Swipe the ring and pinch without accidentally opening a destination. Tap a visible neighbouring card and use VoiceOver to select one in All worlds.
3. Verify private commands and integrations are unavailable as a guest. Choose **Sign in for tools**. Cancel and confirm the same guest destination remains; after a verified sign-in and onboarding, confirm the member destination resumes.
4. Repeat signed-in and inspect actual world and tool behavior. The source-only checks do not establish real-device functionality or provider sign-in.
