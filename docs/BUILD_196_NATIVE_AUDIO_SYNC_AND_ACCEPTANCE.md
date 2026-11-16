# STAARWAARDD — Build 196 synchronized native launch audio

## Accepted scope
The three Build 189 cinematic portraits remain the approved **visual direction**, not the finished 3D face. The original `guardian-startup.mp4` is unchanged. The exact approved `Starward Guardian(2).m4a` was recovered in Build 193; its SHA-verified AAC compatibility copy remains private and must be included through the Build 195 EAS upload procedure.

## Production audio defect fixed
Build 194/195 started the locked film and separate AAC when the audio session was initialized, without requiring the AAC to finish loading. That can produce a silent delay at the beginning of the film and late soundtrack onset on cold launch, even though source tests pass.

Build 196 introduces an independent pure startup-audio coordinator and uses Expo Audio's `useAudioPlayerStatus` to control playback:
1. Initialize the foreground audio session with no recording/background privileges.
2. If the owner-approved AAC module is present, wait until the media has loaded before starting either the film or the song.
3. Start the original locked video with its embedded audio muted and the AAC together. Reuse the existing in-app mute state across both.
4. If the AAC reports a decoder error or has not loaded within 3.5 seconds, mark it failed, cancel the timer, resume the original film's embedded soundtrack, and keep the skip button functional.
5. With no privately staged AAC, start the existing film normally in development; with reduced motion, skip without leaving audio playing.
6. On completion, skip, or replay-component disposal, stop/pause the separate music. Soundtrack-specific playback is foreground only.

## Regression coverage
Seven executable test cases exercise the pure coordination state: fully loaded source, delayed loading, session not ready, timeout/error fallback, no private music in public CI, user mute, and skip. Existing source-level tests now verify the status hook and 3.5-second fail-safe.

## Release compliance
No private owner song, actual facial images, extracted facial-video frames, or Apple signing credentials are committed to the public repository.

The following are **NOT** verified by this build:
- The sound actually starts at the correct frame on a physical iPhone or a signed build.
- EAS authenticated `build:inspect` archive containing the user-authorized private AAC.
- Final founder-approved armoured Guardian 3D head and all 16 authentic speech-aligned visemes.
- The ten founder-approved cinematic 3D world masters.
- App Store Connect signing, iOS build 106, Apple Watch pairing, provider live OAuth/readback or TestFlight approval.

The earlier independent evidence, identity, and founder release gates remain in force. **No new CAD cash or paid generation credits were used.**
