# Guardian startup correction

The product previously played v4 on web, a different traversal clip on native,
and another different clip as the browser fallback. It then replayed a separate
arrival/portal animation. Mobile `cover` could crop the supplied final layout.

## Current behavior

An intentional entrance tap starts the existing score and a 1.6-second animated
maple-sigil fly-in, using the app's existing art. The film then plays the first
five seconds of the original Toronto flight, the existing sequential portal
clip slowed to 0.8x (ten seconds), and a one-second final-frame hold. This is a
16-second film, plus the short sigil prelude. It hands off once into the awake
live Hub. Direct `/hub` remains available. Skip and reduced motion remain.

MP4, VP9 fallback and native use the same timeline. Both platforms use the same
independent launch score; the video is silent. Native bundles that score.
Full-frame `contain` preserves the portal edges on narrow screens. The escape
deadline follows actual metadata, allowing longer future masters without the
previous fixed 45-second cutoff. Mute/stop also stops the independent score.

## Source and editorial decision

Recovered Magnific creation `Do5NoNJpcl` is the seven-portal sequence associated
with the latest request for slower pacing. Its original Guardian reference is
`4RdKRnH9Aa`; the supplied final-layout reference is `fH70HLmCDY`. Retiming created
`s7cD1fLl8e` at speedFactor 0.8, without paid generation. No face editing, frame
interpolation or cropping was used. Existing model artifacts remain.

The finale's first frame matches the original film at about 5.0 seconds. This
cut deliberately omits the later repetitive flight and rejected old ring ending;
it does not preserve the entire old 29-second film. The older 59-second masters
change the Guardian and were not substituted. The sigil prelude is an app motion
layer, not newly generated footage of a thrown physical shield.

All seven portals remain in the supplied final image. Earlier branch notes
saying only one portal may remain visible are superseded: reveal one at a time,
then retain the final seven-portal layout. This patch reuses the existing generated
clip rather than claiming to remove every visual imperfection in it.

## Reproduction and validation

Run `python frontend/scripts/assemble-guardian-startup.py <retimed-finale.mp4>`.
Original retimed file SHA-256:
`05450eb8e4f264ceb73ed798fa27a3621058c6598cfe7a524a8e6353799d16e7`.
Final MP4 SHA-256:
`09f5746170f27b45518cb698c2c5f679ce38f39db3625f0a127e547464d97ad6`.

- Three deadline tests pass, including late metadata and a 90-second master.
- Three actual-media tests pass: duration/codecs, sampled MP4/VP9 frame parity,
  original flight preservation and final hold.
- Focused React Native Web DOM smoke covers entrance/prelude, playback, full-frame
  fit, mute, fallback and exactly-once completion. Media/audio/storage boundaries
  use adapters; this is not a device visual test.
- Startup CI exports web and iOS bundles. An iOS export is not an installed-device
  playback or sound test. Production main is unchanged pending product review.
