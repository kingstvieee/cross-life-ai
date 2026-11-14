# Locked homepage correction — 14 November 2026

Status: implementation candidate. Preserve the approved visual masters. This is
not final visual acceptance, a TestFlight release, or a completed Guardian rig.

## Requirement and implementation

| Requirement | Change | Evidence / current limit |
| --- | --- | --- |
| Nine moving liquid-glass bubble entrances | Shared spherical lens material, texture refraction, chromatic edge separation, Fresnel reflection, moving highlights and silhouette; Skia on native, WebGL on web | SkSL compiles and renders real offscreen pixels; time changes pixels, corners are transparent, interior samples the image. Browser GPU runtime remains unverified. |
| All nine entrances usable on a phone | Stationary accessible touch targets around central Guardian; compact portrait and landscape arrangements | Seven viewport layout tests pass: 320×300, 360×350, 390×530, 430×620, 844×180, 1024×490, 1440×650. Each has nine nonoverlapping targets at least 44 pt, contained in the scene. These are scene dimensions, excluding header/dock/safe areas. |
| Approved homepage visual language | Existing black/chrome/silver master, central Toronto/platform crop and animated surface/star highlights | Original master unchanged. A portrait adaptation is implemented, not visually approved; architecture is still artwork, not a reconstructed 3D scene. |
| Tap into the portal world | All nine existing routes now use full-screen approved panoramic environments, swipe exploration, live tools panel, microphone/conversation control and back navigation | Source and both platform bundles checked. World environments remain artwork with optical animation; not live 3D meshes. Existing planning conversations are preserved. Baked artwork labels do not establish connections or device states. |
| Guardian speaks first after login | Arrival timer waits for authenticated account, foreground, focus, settings load and motion preference; no tap required | Session gate test proves one claim per account/session, no pre-auth greeting and no repeat after Hub route remounts. Actual authenticated speech endpoint/playback is unverified. |
| User can silence Guardian | Persisted mute and quiet modes remain respected; fresh-install voice defaults on while music/ambience remain off | Source/type checks; microphone is never opened automatically. Phone recording/transcription and spoken replies reuse existing chat flow. |
| Seamless Guardian flight and speaking | Existing flight/hover states and stable playback callbacks retained | BLOCKED: startup and current hover assets do not provide a matching background-free, speech-responsive rig. No lip sync or seamless film-to-rig continuity is claimed. Web retains its existing pose-art fallback. |

## Fresh verification

- `node --test frontend/tests/liquid-hub.test.mjs`: 9/9 passed, including actual
  CanvasKit runtime-material compilation/rendering and account/session greeting gate.
- `frontend/node_modules/.bin/tsc --noEmit -p frontend/tsconfig.json`: passed.
- Focused ESLint on homepage, world route, liquid material components and new
  layout/art/session modules: passed with zero errors or warnings.
- Expo web and iOS JavaScript/Hermes export: passed. This does not compile Swift,
  sign an iPhone app, process TestFlight, or demonstrate physical-device behavior.
- `git diff --check`: passed.
- Chromium end-to-end attempt could not start: the execution environment denied
  creation of Chromium's process socket. No route-click, audible speech, browser
  screenshot or iPhone acceptance is reported as passed.
- Pre-existing broader lint failures remain in Guardian/audio modules. Baseline:
  49 Guardian errors, 2 audio errors and 2 audio warnings. No full-suite pass claimed.

## Release gate

1. Supply or locate the approved matching background-free Guardian animation/rig
   with speech animation. Do not regenerate the face or substitute another Guardian.
2. Verify the exact startup→login→arrival transition, first spoken prompt and phone
   reply on a real iPhone with the configured authenticated backend.
3. Inspect all nine portal entries/returns, mute/resume, background interruptions,
   reduced motion, portrait/landscape and material performance on device.
4. Approve the responsive composition against the locked masters. Keep artwork
   preview status distinct from a fully spatial 3D implementation.
5. Only then prepare the replacement TestFlight release. No production merge,
   live deployment, App Store release, paid generation or purchase is included.

## Remote review status

Automatic approval review rejected uploading the 14 changed source files to the
public `kingstvieee/cross-life-ai` repository: the generic “Proceed” did not explicitly
authorize public source-code publication. No remote branch or pull request was
created. The exact local patch is available for approval; no alternate upload route
was attempted.
