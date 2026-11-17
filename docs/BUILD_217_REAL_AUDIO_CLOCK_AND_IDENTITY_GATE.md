# Build 217 — Guardian real playback-clock / 16-viseme integration
**Execution date:** 2026-11-16 Toronto | **Incremental cost:** CAD $0

## New implementation
1. The production WebView / web renderer reports `guardian-face-ready` **only when a GLB already verified at build time** loads and exposes the complete 16 target morph controller. No 2D reference and no historically rejected GLB can report this state.
2. The native and web scene hosts bind that exact GLB SHA-256 to the current audio context and clear it on screen change, companion/account switch, mute and navigation away.
3. On a user-authorized Guardian speech request, the backend speech cache returns the existing clip's actual SHA-256. The client requests Rhubarb-derived alignment for this exact audio only when a real approved 3D rig is present. The server enforces user authentication, audio hash, cache expiry, capacity and prevents cross-account delivery. This is the existing account-bound local processing endpoint, **not** another paid generative request.
4. `expo-audio` supplies actual `AudioStatus.currentTime` and `duration` in seconds on a 100 ms update interval. Build 217 converts these to integer milliseconds and pairs the verified alignment with the active SHA-256 of the loaded Guardian model. Unsigned, unverified, stale, muted, buffering or mismatched audio yields **no packet** and resets the mouth to neutral.
5. The model-specific packet reaches the existing `guardian-speech-bridge.js` and `guardian-face-motion.js` in the 3D scene, which apply only the bounded verified target weights. UI speech-active status by itself cannot fabricate cue timing.

## Verified by code CI
- Audio packets are generated from actual playback positions, not text-derived guesses.
- Audio identity, exact model SHA, 16 morph target bindings, clip duration and account session are fail-closed.
- Account changes, pauses and absence of a final model clear the animation.
- Existing 2D Guardian still remains the visible default until a genuinely final model is independently accepted.

## Not evidence of final production acceptance
The current ChatGPT Library's last recovered 3D Guardian is the Build 201 review-only GLB with incorrect front/side facial profile. Build 202 rejected a later candidate; Build 208 repairs speech morph independence but still inherits an unaccepted face. Their source hashes remain blocked. Existing Build 212 owner design approval records the appearance, **not** a new production binary hash or authentic 3D head scan.

No verified owner-accepted *new* final facial-model GLB, real-device lip-synchronization recording, rights certificate or signed release IPA was found in the current known source. A green structural playback test **does not** turn that into a true facial likeness approval.

## Completion path
- Generate or import an actual new skinned GLB faithfully matching locked *front, three-quarter and both side* references and armored design. Do not substitute a stock avatar or the rejected egg-shaped prototype.
- Preserve 16 morph names, independent speaking displacement geometry, full armor and specific signed reference/provenance. Exact file hash and rights must match its own production receipt.
- Perform actual audio/viseme playback readback on a signed iPhone build and record the acceptance against the new model SHA.

**Status:** Live audio clock and cue integration complete in source; final model artwork and real-device acceptance separately required.
