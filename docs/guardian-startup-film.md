# Guardian startup film

The startup boundary runs before authentication and account providers. It plays the user-supplied 29.2667-second portrait film once per fresh launch, then fades into the existing access boundary. Signed-out visitors receive sign-in or the explicit sample-only guest route. Authenticated users enter the hub without a second launch or arrival film.

The source video is unchanged: `frontend/assets/videos/guardian-startup.mp4`, 18,775,244 bytes, SHA-256 `1c8dce7f7b5f18e9ae580ec14910a0e20939cb8b52ec43897a08d2ecaa98886c`. Both platforms use contain framing. No face generation, recoloring, replacement audio, or paid providers were added.

Playback starts muted for browser autoplay support. Play with sound and sound toggle controls are available. Skip works while loading or after failure. A loading timeout exposes the error message and Enter app action. Completion follows the playback-ended event, not a guessed duration. Reduced-motion users bypass the film. Replay is available from sign-in and account Settings; it preserves mounted account state.

Validation: TypeScript no-emit and Expo web export passed locally. The export includes the original video. iOS export and device playback must be recorded separately; an export is not a signed native build. Browser autoplay restrictions and iPhone audio/background behavior still require real-device testing.

Deployment: Emergent received the complete video but stopped on exhausted credits before implementing or republishing this version. This branch contains the independent code implementation. No credits were purchased. Existing Google/Microsoft/email provider configuration and EAS/Apple signing blockers remain unchanged.

Existing native configuration: slug `frontend`; iOS bundle ID `com.emergent.crosslifeai.z79271`. The repository does not yet bind the candidate EAS project ID to a verified owner. Do not overwrite identifiers or initialize a replacement EAS project to bypass that check. The user's Expo screenshot shows personal account `staarwarddceo` and organization `staarwarddceos-team`; this alone does not establish project ownership.
