# STAARWAARDD Guardian — nine-portal Runway handoff and release gate

Date: 2026-11-15
Owner: STAARWAARDD
Canonical repo: kingstvieee/cross-life-ai
Production candidate: Runway Huncho, task `6d3c94ad-57a7-4a44-a670-5295f2934363`
Source frame: `startup-25s.png`, Huncho asset `dc251255-5195-4f33-baf1-124509142746`
Guardian identity reference: `locked-guardian-toronto.png`, Huncho asset `b7881f00-fa7b-4756-81f2-8d0ce12e210e`

## Locked requirements

**Exactly NINE portals**, never seven. The nine interactive app worlds and the nine cinematic portal identities must use the approved `world-directory` as their source of truth. Do not fabricate additional world names. A former seven-portal MagicLight specification is HISTORICAL and superseded for portal count by founder approval on November 15.

Identity: preserve the approved Guardian face, hair, hairline, skin tone, proportions, silver/white/gold winged suit and chest sigil. Preserve Toronto/CN Tower, live camera motion, head-and-eye tracking aligned to each of nine separate hand gestures, continuous scene movement and slowly opening volumetric 3D world gateways. No static frames, flat app circles, visual redesign, hard cut, or clicking sounds.

## Runway outcome

- Nine-portal correction generation accepted and marked succeeded. Output: 720x1280, 10.083333 seconds.
- Earlier approved ten-second candidate task: `0551760d-d272-485e-8aa8-49391b1e0cfa`.
- Two rejected character meshes from the same workspace are explicitly prohibited: `REJECTED_user_declined_appearance_v2_DO_NOT_USE.glb` and `REJECTED_identity_mismatch_DO_NOT_USE.glb`.
- Credits used by these two Runway video tasks: 100 of founder-authorized 120; authorized balance for additional spending 20 credits.
- **Visual QA not completed**: Runway confirms task success but does not independently confirm the portal count or facial consistency. The external signed video could not be downloaded in the evaluation environment; no frame-by-frame audit has occurred. Generation wording is not QA evidence.

## Acceptance gates — ALL required before master promotion

1. Compare first/middle/last Guardian face against approved locked source with no drift.
2. Inspect the whole timeline and count **exactly 9** distinct fully opened 3D gateways in the final composition; no missing, duplicate or extra portals.
3. Each portal must be progressively formed by a Guardian hand movement and corresponding head/eye turn.
4. Check each second for stalled video, frozen 27-second handoff, timing mismatch, clipped wings, deformed hands and awkward motion.
5. Preserve Toronto/CN Tower, same wing geometry, suit, sigil, continuity of lighting and perspective.
6. Verify original and transition sound: no repetitive clicking, no audio pop, no unintended replacement soundtrack.
7. Preserve the founder-locked original startup master byte-for-byte, with its existing file path and all startup playback wiring unchanged. If a nine-portal continuation is later approved, package it as a separate, versioned post-startup scene only; never splice into, overwrite, replace, regenerate or rename the startup video. Test the transition without editing the locked startup master.
8. Test on web, physical iPhone and TestFlight. Reduced-motion, muted autoplay, replay, skip, auth state preservation, and error/timeout fallback must all pass.

## Existing runtime and safe migration

At this checkpoint both native `frontend/components/staarwardd/startup-film-player.tsx` and web `frontend/components/staarwardd/startup-film-player.web.tsx` load `frontend/assets/videos/guardian-startup.mp4` using bundled `require`. The 29.2667-second original asset is the **founder-locked production startup master**, NOT merely a rollback. It must remain unchanged regardless of whether the new continuation passes QA.

Founder correction (2026-11-15): **DO NOT REPLACE THE STARTUP VIDEO. IT IS ALREADY LOCKED.** Retain `frontend/assets/videos/guardian-startup.mp4` and both native/web `require` references unchanged. Any approved nine-portal material belongs exclusively in a separate optional continuation/Hub scene with its own new asset and independent playback component. Do not alter startup duration, frame content, soundtrack, opening controls, filenames or asset hash. If the continuation is connected to the app later, verify it does not replay the locked opening. Verify Expo/EAS project owner and Apple/TestFlight signing separately; web deployment does not demonstrate a native release.

### Status
**CONDITIONAL / NOT RELEASE READY.** This file is an auditable evidence checkpoint, not approval of the render's visual output, not a startup replacement, not a final continuation master, and not a deployment. Do not claim finished until all gates pass.
