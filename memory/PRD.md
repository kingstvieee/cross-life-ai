# STAAR Hub — PRD & Progress

## Original Problem Statement
Mobile-first AI app "STAAR Hub" for the STAARWAARDD competition. Core concept: **Cross-Life Context Intelligence** managed by "The Guardian" across seven life portals (Creativity, Work, Home, Wellbeing, Relationships, Community, Style).

## User Choices
- Scope: Priorities 1–9 fully polished (Architecture, Landing, Cinematic Skia Intro, Hub, Work Portal, Cross-Life engine, Wellbeing+Home demo flow, Guardian View, Demo Mode)
- AI: GPT-5.4 via Emergent LLM key (backend only)
- Auth: Demo Mode + Emergent Google Auth
- Visuals: Skia + Reanimated cinematic Toronto/Guardian intro; "6 Glass / Luxe (Luminous Light Mode)" per /app/design_guidelines.json
- Event data: realistic seeded demo events (Toronto)

## Architecture
- Backend: FastAPI + MongoDB (`/app/backend/server.py`), Emergent LLM key (GPT-5.4) via emergentintegrations
- Frontend: Expo Router + React Native Skia + Reanimated
- Skia on web: custom entry `/app/frontend/index.js` (package.json main) loads CanvasKit via LoadSkiaWeb BEFORE mounting expo-router. Wasm self-hosted at `/app/frontend/public/canvaskit.wasm` with CDN fallback — REQUIRED, never revert main to expo-router/entry

## Key API Endpoints
- POST /api/auth/demo, POST /api/auth/session (Emergent Google), GET /api/auth/me, POST /api/auth/logout
- POST /api/user/profile, POST /api/user/privacy
- GET/POST /api/portal/{id}/state, GET /api/community/events, POST /api/demo/reseed
- GET /api/guardian/signals, POST /api/guardian/coordinate-evening, GET /api/guardian/view
- POST /api/guardian/chat-once (used by app), POST /api/guardian/chat (SSE, unused)

## Screens (all built)
- /intro — Skia cinematic (Toronto skyline, Guardian arrival, portals reveal)
- /landing — hero + Experience Demo + Google Sign-in (session_id deep link handling)
- /onboarding — 4-step (portals, autonomy, companion)
- /hub — radial hub: Guardian orb center, 7 portal nodes, cross-life energy lines from signals, signal banner, companion switcher
- /work — demo epicenter: workload/stress, tasks, Guardian intervention card → "Coordinate my evening" → animated coordination sheet
- /portal/[id] — wellbeing (decompression + breathing anim), home (routine/lights/temp/reminders), community (events + RSVP), style (planned outfit), relationships, creativity
- /guardian-view — coordination timeline with source→target flow pills
- /chat — Guardian/Kaia/Atlas chat (chat-once, GPT-5.4)
- /settings — autonomy, companion, cross-life pause, per-portal access/share, reseed, logout

## Demo Flow (judge path)
Landing → Experience Demo → Hub (work signal active, cyan lines) → Work → Coordinate My Evening → 6-portal coordination sheet → Guardian View → Wellbeing shows active decompression, Home shows routine running, Style shows prepared outfit.

## Canonical STAARWAARDD Integration (iteration 5 — CURRENT STATE)
- Canonical source from checkpoint f68171a is the approved experience: components/staarwardd/* (CinematicHub, LaunchSequence, GuardianArrival, Guardian character media) + lib/staarwardd/* (StaarAudioProvider, PreferenceMemoryProvider, GuardianActivityProvider, HomeSafetyProvider). DO NOT redesign/replace these.
- Route wiring: / = LaunchSequence (Toronto Response Flight cinematic, sound/skip) → GuardianArrival → CinematicHub; /hub = CinematicHub; /landing and /intro = Redirect to /; canonical Work opens at /portal/work ("Executive Command Workspace"). Legacy routes /chat, /guardian-view, /settings, /portal/[id], onboarding preserved.
- _layout.tsx wraps Stack with all four staarwardd providers + AuthProvider; fonts/splash/gesture/safe-area/StatusBar intact.
- Dead template files (trpc, nativewind, themed-view, use-colors, etc.) moved to /app/backups/unused-template-lib; canonical archives in /app/backups. `npx tsc --noEmit` passes clean.
- Verified by testing_agent iteration_5: all 9 acceptance checks pass (mobile 390 + desktop 1280). Known non-blockers: CanvasKit ArrayBuffer fallback notice.
- STARTUP RULE (iteration 10, user-mandated): app/index.tsx — "/" ALWAYS plays the complete canonical entrance on every fresh page load; the 'staarwardd.launch-seen' flag NEVER skips it (markSeen still recorded; Judge Reset unchanged). Direct /hub remains the fast path and all portal HUB returns go to /hub. Do not reintroduce returning-user gating on "/".
- JUDGE RESET (iterations 8-9, INDEPENDENTLY VERIFIED 8/8): keyboard accessible, cancel inert, confirm clears exactly the 5 intended stores (unrelated keys survive), opening replays immediately, audio streams zero-pageerror. Layout regression fixed: styles.root in cinematic-hub.tsx MUST keep overflow:'hidden' (590px orbitLine intentionally bleeds past mobile viewport; without it /hub@390 gets 102px h-overflow). — ⟲ button in CinematicHub header opens confirm modal; on confirm calls erase() on preference-memory/guardian-activity/home-safety providers, resets audio to defaults, multiRemoves ['staarwardd.launch-seen','staarwardd.v13.audio-settings','staar_intro_seen','staar_tour_done'], then router.replace('/') → full Toronto opening replays. NOTE: audio hook is useStaarAudio (not useAudio).
- WEB AUDIO FIX (iterations 6-7, VERIFIED zero pageerrors): lib/staarwardd/audio-provider.tsx — web uses {uri:'/audio/<file>.mp3'} sources served from /app/frontend/public/audio (audio/mpeg MIME); native keeps require() bundles. One cached AudioPlayer per sound (NEVER call replace()/remove() during session — expo-audio web strips src and fires spurious MediaErrors). Web-only unhandledrejection suppressor scoped to 4 benign media reasons. All cues stream (HTTP 206): toronto-portal, transition, cloud-rumble, hub, shield, portal.

## Status (previous iterations)
- Backend: complete — pytest suites passing (iterations 1-3)
- Frontend: Cinematic Luxe Dark design; GPT-5.6-terra chat; OpenAI TTS voice
- Refinement pass (iteration 4): branded boot loader injected from index.js (dev+prod), title/meta/favicon set, intro shortened to ~6s + persisted via 'staar_intro_seen' + replayable from Settings, reduced-motion support (intro/hub), a11y (all Pressables role=button + labels), responsive hub via useWindowDimensions (resize-safe), 360px header fixes, desktop maxWidth constraints (640-720) on hub/landing/settings/guardian-view/sheets/chat, walkthrough START THE DEMO → routes to /work, SIMULATED labels on coordination actions + disclaimers in sheet/guardian-view/settings, settings helper texts

## Notes
- Demo login creates ephemeral user + seeded scenario; no persistent test creds needed (Google auth is Emergent-managed)
- Do not modify protected .env values / metro.config.js

## Session Update (June 2026) — Video Entrance Fixed & Regression Passed
- Fixed the uninterrupted video entrance autoplay: video ALWAYS starts muted on fresh load (browser muted-autoplay allowed), regardless of saved sound prefs. ENABLE SOUND unmutes and continues the same timeline (never restarts).
- Added codec-aware source selection: H.264 mp4 for real browsers, VP9 webm fallback (/video/guardian-toronto-traverse-v22.webm, identical clip) for browsers lacking proprietary codecs; plus error-event src swap and self-heal play retry.
- Testing Agent full frontend regression (iteration_10.json): 9/9 PASS — muted autoplay advances past 1s with zero clicks, sound toggle, 7 portal overlays over moving video, auto Hub transition, Skip, direct /hub, Judge Reset replay, demo coordination APIs (coordinate-evening/morning) 200 OK.
- Note: real endpoint names are /api/guardian/coordinate-evening and /api/guardian/coordinate-morning.
- Remaining optional (non-blocking): RN Web shadow*/pointerEvents deprecation warnings, CanvasKit fetch warning on web.
- Fixed Judge Reset regression: reset now hard-navigates to a clean root (web: window.location.assign('/'); native: reset param clears index.tsx session state). Verified from both direct /hub and post-skip Hub — entrance video replays with advancing currentTime. Direct /hub fast path unchanged.
- Judge Reset regression #2 fixed: the confirmation modal was the failure (single click only opened it, appearing broken). Now a true ONE-TAP reset — the visible hub button directly clears all flags and hard-reloads to clean '/'. Verified via real accessibility-tree clicks from both /hub and /?flow_reset=1 post-skip: entrance video plays with advancing currentTime, URL resolves to '/'.
- Added gateway caption strip during entrance (testID gateway-caption) cycling each portal name as it materializes.
- Added Guardian spoken Onyx welcome as the Hub resolves: GET /api/guardian/greeting (cached TTS via Emergent key) played post-entrance; falls back to first-tap playback under autoplay policy; direct /hub does NOT greet.
- Console cleanup complete: replaced all deprecated shadow*/textShadow* props with web boxShadow/textShadow via lib/staarwardd/shadow.ts glow()/textGlow() (native keeps classic props); moved all JSX pointerEvents into styles. Console verified quiet.
- Iteration 11 regression: backend 4/4 (greeting + tts endpoints), frontend 8/8 (entrance, captions, hub, greeting requests, glow visuals, one-tap Judge Reset, direct /hub, quiet console).
- Three UX features shipped & verified (iteration 12): (1) greeting subtitle line shown while Guardian speaks his Onyx welcome on the hub; (2) 90-second judge demo countdown badge (slim top pill, persists across screens, tap to dismiss, auto-clears, stopped by Judge Reset); (3) portal voice notes — one-line Onyx intro spoken on entering each world (GET /api/guardian/portal-intro/{id}, cached in Mongo tts_cache).
- Security audit run + fixes verified (iteration 12, 11/11 backend tests): demo login 10/hr/IP, chat 20/min/user, TTS 30/min, chat message max 2000 chars (422), portal state payload max 20KB (413), generic error messages (details logged server-side only), CORS allow_credentials=False with wildcard origins. Audit confirmed: no injection, no path traversal, no XSS, no BOLA, no secrets in frontend bundle.
- Test suite: /app/backend/tests/test_iteration12_security.py (do not casually re-run chat rate-limit test — spends ~21 GPT calls).
- Judge Scorecard shipped: /scorecard closing summary (coordinated action receipts, remembered preferences, memory status, back-to-hub + reset-for-next-judge). Opens via VIEW SCORECARD on auto-demo completion, tapping the demo countdown badge, or automatically when the 90s timer expires.
- Memory Highlights shipped: first portal visit -> Guardian speaks the world intro; RETURN visit -> he recalls one remembered preference aloud (scene/room/routine/name/preferred world) via new authenticated POST /api/guardian/speak-line (200-char cap, rate limited). Session visit tracking in lib/staarwardd/portal-visits.ts, cleared by Judge Reset.
- NOTE: an auto-running JudgeDemo walkthrough (components/staarwardd/judge-demo.tsx, 6 scenes, ~56s, records receipts per scene) was added outside this agent session; hub button is now 'START JUDGE DEMO · AUTO'. Timer + scorecard integrated with it.
- Scorecard Voice: Guardian narrates the verdict aloud (Onyx) as the scorecard appears, with an on-screen subtitle line; waits for auth token.
- Share Scorecard: backend PIL-rendered 1080x1350 PNG (GET /api/scorecard/image, auth + 10/min limit); web downloads the image, native shares via expo-sharing (+expo-file-system installed).
- Ambient Score: each world's soundscape (existing per-portal mp3s) fades in over ~1.8s on entry via new audio.playAmbient()/stopAmbient(), stops on exit; respects master/ambience settings.
- CRITICAL FIX: restored automatic demo login in AuthProvider (fresh browsers previously had no session, causing 401s on all authed features). Demo mint limit raised to 30/hr/IP.
- External change noted: judge-demo.tsx rewritten again outside session ('RUN LIVE CRISIS DEMO · AUTO', ~6+ scenes); timer/scorecard integrations preserved.
- Iteration 13 FULL judge-journey regression: PASS (backend 11/11, frontend 8/8). Entrance video, auto-login, hub greeting+subtitle, crisis auto-demo + 90s timer, scorecard (voice, subtitle, share PNG), portal voice+ambient, one-tap Judge Reset, core coordinate-evening/morning flow — all confirmed working after the external judge-demo.tsx rewrite. App declared judge-ready. Test suite: /app/backend/tests/test_iteration13_regression.py.
- Crisis demo overhaul per user feedback: scenes are narrated by the real Onyx Guardian voice (speak-line, cache pre-warmed) and only advance when narration finishes; Guardian actions now visibly execute live (QUEUED -> EXECUTING -> DONE) during each scene; speaking indicator reflects actual audio; demo countdown extended to 240s to match the ~3min speech-paced runtime.
- Merged GitHub branch codex/immersive-guardian-demo (4 commits through c5cc9a5): new JudgeActionTheatre component (before/after cards, node pipeline, live action log per scene), judge-demo rewritten with short per-scene GUARDIAN_VOICE_LINES (Onyx, all pre-warmed in tts_cache) and dual gating (scene advances only after voice AND visible actions complete), DEMO_SECONDS=180, immersive InfoModal copy. Local improvements preserved: onFinish/view-scorecard-btn, parameterized timer start, auto-login, scorecard suite.
- Post-merge E2E verified: all 7 scenes, action theatre on each, ONYX VOICE indicator live, scene gaps 10-13s (gated), DEMO · 3:01 badge, scorecard shows 6 receipts, timer clears.
- Scene sound effects: synthesized soft two-note success chime (public/audio/node-chime.mp3 + assets copy for native) plays at low volume (0.22) each time an Action Theatre node completes, gated by the master sound setting. Verified in-demo.
- GitHub push attempted with user's fine-grained token: 403 (token is Contents:Read only). Local main is 6 commits ahead including the codex merge; needs a read-write token or the platform Save to GitHub flow.
- Merged remote GitHub main into local (branding: STAARWAARDD canonical spelling everywhere, Relationships gateway name restored, Community label for events portal, widescreen blurred-poster cinematic treatment on desktop entrance) while keeping the newer immersive demo engine, chimes, and all local features. Conflicts resolved in judge-demo/cinematic-hub/scorecard favoring local + hand-applied remote branding.
- PUSHED to GitHub: kingstvieee/cross-life-ai main -> e578aa9 (Codex and Emergent now in sync). Post-merge smoke test: entrance plays, hub renders with Relationships + Community + crisis demo button.
