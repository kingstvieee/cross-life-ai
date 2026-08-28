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

## Status
- Backend: complete — 21/21 pytest passed (/app/backend/tests/test_staar_hub.py)
- Frontend: all screens built and verified; testing_agent iteration_1 passed all flows (demo → hub → work → coordinate → guardian view → wellbeing/home/style → chat GPT-5.4 → settings)
- Fixed this session: Skia web crash (custom entry), intro hooks-in-map crash, canvaskit self-hosting

## Notes
- Demo login creates ephemeral user + seeded scenario; no persistent test creds needed (Google auth is Emergent-managed)
- Do not modify protected .env values / metro.config.js
