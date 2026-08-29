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
- JUDGE RESET (iteration 8, self-tested & verified): components/staarwardd/judge-reset.tsx — ⟲ button in CinematicHub header opens confirm modal; on confirm calls erase() on preference-memory/guardian-activity/home-safety providers, resets audio to defaults, multiRemoves ['staarwardd.launch-seen','staarwardd.v13.audio-settings','staar_intro_seen','staar_tour_done'], then router.replace('/') → full Toronto opening replays. NOTE: audio hook is useStaarAudio (not useAudio).
- WEB AUDIO FIX (iterations 6-7, VERIFIED zero pageerrors): lib/staarwardd/audio-provider.tsx — web uses {uri:'/audio/<file>.mp3'} sources served from /app/frontend/public/audio (audio/mpeg MIME); native keeps require() bundles. One cached AudioPlayer per sound (NEVER call replace()/remove() during session — expo-audio web strips src and fires spurious MediaErrors). Web-only unhandledrejection suppressor scoped to 4 benign media reasons. All cues stream (HTTP 206): toronto-portal, transition, cloud-rumble, hub, shield, portal.

## Status (previous iterations)
- Backend: complete — pytest suites passing (iterations 1-3)
- Frontend: Cinematic Luxe Dark design; GPT-5.6-terra chat; OpenAI TTS voice
- Refinement pass (iteration 4): branded boot loader injected from index.js (dev+prod), title/meta/favicon set, intro shortened to ~6s + persisted via 'staar_intro_seen' + replayable from Settings, reduced-motion support (intro/hub), a11y (all Pressables role=button + labels), responsive hub via useWindowDimensions (resize-safe), 360px header fixes, desktop maxWidth constraints (640-720) on hub/landing/settings/guardian-view/sheets/chat, walkthrough START THE DEMO → routes to /work, SIMULATED labels on coordination actions + disclaimers in sheet/guardian-view/settings, settings helper texts

## Notes
- Demo login creates ephemeral user + seeded scenario; no persistent test creds needed (Google auth is Emergent-managed)
- Do not modify protected .env values / metro.config.js
