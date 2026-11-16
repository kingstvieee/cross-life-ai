# STAARWAARDD Build 195 — Private EAS Archive & Startup Audio Failure QA

**Owner's locked requirement:** The exact approved `Starward Guardian(2).m4a` starts automatically with the original locked startup film on native iOS; the owner can mute or unmute at any time. No generic replacement song, no changed video, no public disclosure of original recordings.

## Problem corrected
Build 194 introduced correct SHA-verified private audio sourcing and sound-on playback code, but the public GitHub repository intentionally ignores the 6.7 MB AAC and native Metro source module. Expo normally derives its upload ignores from Git ignore files. Without a local `.easignore` with explicit include rules, the private AAC would not reach the EAS archive despite passing source-only CI. That is not a production-ready soundtrack release path.

Expo's own `.easignore` documentation explains both the Git-root placement and last-rule `!` include syntax, and recommends inspecting the archive without triggering a build: https://docs.expo.dev/build-reference/easignore/

## What Build 195 implements
- `frontend/scripts/prepare-private-eas-archive.mjs`: works only in the owner's private local checkout. It **first** verifies both exact private AAC bytes and the exact matching generated `.native.ts` Metro alias, then generates a private Git-root `.easignore` incorporating the existing root and frontend ignore rules with two explicit, last-rule exemptions:
  - `!frontend/assets/audio/Starward_Guardian_Approved_AAC_iOS.m4a`
  - `!frontend/components/staarwardd/startup-approved-soundtrack-source.native.ts`
- The generated `.easignore` itself is ignored by the public Git repository and cannot overwrite an unexpected existing file.
- `inspectPrivateEasArchive` independently checks files inside an *actual copied EAS inspect output directory* against exact AAC length, hash and private native source code. It refuses a missing, substituted or altered file.
- The native startup player now also listens for Expo Audio's `playbackStatusUpdate` asynchronous `error`, pauses the broken standalone player and falls back to the original film's audio. Previously only synchronous `play()` exceptions were handled.
- New tests cover private include rules, missing media, dangerous overwrite, archive byte tampering, and correct Git-root path semantics. They run in Guardian Release Gates.

## Required owner-controlled EAS staging sequence
1. Extract the separate **private** Build 194/195 package. Preserve the unmodified approved original `Starward Guardian(2).m4a` and the SHA-pinned AAC derivative.
2. In an owner-controlled checkout, stage exact AAC:
   `node frontend/scripts/stage-approved-startup-audio.mjs /private/path/Starward_Guardian_Approved_AAC_iOS.m4a`
3. From the Git repository root, prepare local upload rules:
   `node frontend/scripts/prepare-private-eas-archive.mjs prepare`
4. With an authenticated, authorized Expo account, use the **non-building** inspection command from the Expo project directory:
   `eas build:inspect --platform ios --profile production --stage archive --output ../private-eas-inspection`
5. From repository root verify the extracted archive:
   `node frontend/scripts/prepare-private-eas-archive.mjs inspect private-eas-inspection`
6. Do **not** upload a signed production build until Build 181/187's art, rights, 11 GLB, 16-viseme, iPhone/Watch and sound playback gates all have genuine evidence. The EAS workflow's founder approval gate remains active.

**Security distinction:** Local EAS archive inspection can verify bytes without starting a build, but it is not proof that an Apple-signed IPA exists or that the song plays correctly through an iPhone's speaker, Bluetooth or silent switch. An eventual cloud build will upload the song to the owner's selected EAS service. That external transfer requires an approved distribution/rights path. The public repo must remain free of the private audio, biometric face references, and the generated include rules.

## Completion and outstanding
Completed: source-code private archive preparation, archive-bytes verifier, async decoder fallback and regression test implementation.

Still missing: actual authenticated EAS archive inspection from the owner's private checkout; final approved Guardian/ten-world GLBs; speech-calibrated visemes; real-device playback; signed IPA/TestFlight candidate 106.

**Spending:** CAD $0 new direct cash charges; no provider credits spent by this build.
