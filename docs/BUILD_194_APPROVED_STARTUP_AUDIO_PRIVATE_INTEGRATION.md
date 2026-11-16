# STAARWAARDD — Build 194: privately staged approved Guardian startup music

**Production state: development-code integration, NOT signed or submitted.**

## Exact approved soundtrack
The user's original `Starward Guardian(2).m4a` is SHA-256 `2b8590fcae07a81e96fad7f6cb4769b02ef6eb0856ee9831ee0eb68c0e1a9938`, 206 seconds, 48 kHz stereo Opus in an MP4 container. It remains unchanged in the owner's Library.

The approved-song iOS playback derivative is `Starward_Guardian_Approved_AAC_iOS.m4a`, 6,743,732 bytes, SHA-256 `ddd63b3622dd7524af8d976d53d7c0afce7cd35a4af1f7c3ce88ba61afadb937`, 48 kHz stereo AAC. It is a lossy codec-compatible conversion of that exact master.

**The repository is PUBLIC. Never commit the original song, private footage, real facial photos or derivative AAC into GitHub.** A separately delivered private Build 194 staging ZIP contains the AAC and source-alias module.

## New native playback
- `startup-film-player.tsx` uses Expo Audio's lifecycle-managed `useAudioPlayer` for the approved private source, starts it with the original hash-locked startup video, and mutes the video's embedded audio whenever standalone music is present to avoid double playback.
- Mute / unmute controls both standalone music and existing movie-sound fallback. Pausing, skipping, replaying or unmounting stops audio; the separate music continues only for the duration of the startup movie.
- `setAudioModeAsync` remains foreground-only with no recording permission, no background play and iOS silent-mode playback. Actual behavior requires an iPhone test.
- The Git-tracked `startup-approved-soundtrack-source.ts` exports `null` so public CI/web export has no private audio. Metro's `*.native.ts` resolution on real devices selects a privately generated source alias only when it is present.
- If the standalone player throws during playback, the film's preexisting audio becomes the fallback.

## Stage in an owner-controlled local checkout
After obtaining the private ZIP, extract `Starward_Guardian_Approved_AAC_iOS.m4a` to a private location. Then run:

`node frontend/scripts/stage-approved-startup-audio.mjs "/private/location/Starward_Guardian_Approved_AAC_iOS.m4a"`

The script validates the exact bytes and SHA-256 **before changing files**, and copies the verified AAC to `frontend/assets/audio/` and a generated Metro module to `frontend/components/staarwardd/startup-approved-soundtrack-source.native.ts`. Both paths are intentionally gitignored. `verify-production-package.mjs` now requires the exact AAC plus the exact native source module, in addition to the 11 approved GLBs, independent human/device evidence, app identity, 106 build number, and original startup movie SHA. Build 194 does not bypass those requirements.

**EAS upload caveat:** `.gitignore` excludes the music from the public repository **and from the default EAS archive**. For a founder-authorized private EAS build, use the documented Expo `.easignore` include rules for both exact staged paths, or an approved private encrypted/file-secret injection method; inspect the upload archive with `eas build:inspect`. Never upload a private build containing these binaries without actual authorization and rights checks. Expo documentation: https://docs.expo.dev/build-reference/easignore/

## Required native QA before final release
1. Verify that audio starts as soon as the introductory film starts without double audio, and the single mute button immediately silences/restores the correct song.
2. Skip and replay: neither action leaves audio running after the movie is gone; reduced-motion startup must not autoplay unexpectedly.
3. Headphones, speaker, silent switch, interruptions/phone calls, Bluetooth, forced close and repeated launching.
4. Compare local app audio perceptually with the **actual** approved original; verify no clip/truncation. Check real-device playback of the AAC itself.
5. Verify signed iOS **106** and the 11 individual approved Guardian/world asset receipts and independent tests; then obtain owner approval before TestFlight.

**No TestFlight upload, Apple signing, production-main deploy, live device playback, or visual approval has been claimed. CAD $0 cash spending.**
