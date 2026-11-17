# Build 223 — Real iPhone Guardian performance evidence capture

**Status:** QA instrumentation source, NOT physical iPhone acceptance. **Added expenditure:** CAD $0.

## Implemented
1. Opt-in iPhone-specific **scene telemetry** is compiled in only when `EXPO_PUBLIC_GUARDIAN_DEVICE_QA=1`. Normal production builds have the flag off, so no background diagnostics are collected.
2. When the **actual approved final Guardian GLB** loads, the 3D renderer binds its exact SHA-256 to an in-memory bounded frame sampler and the existing 16-target motion controller.
3. Samples actual WebGL render-frame intervals and JavaScript render duration using `performance.now()` from the running `WKWebView`. Reports observed FPS, p50/p95 frame gaps, gaps greater than 50 ms, render exceptions and observed audio-derived visemes.
4. The app shows **Capture frame QA / Export QA** only in a deliberately flagged test build. The export uses the native iOS Share sheet, only on deliberate user action, with JSON telemetry. No camera video, identifiable biometric pixels, audio bytes or authentication credentials are sent.
5. The QA report always states `realDeviceCertification: 'UNVERIFIED'`, `physicalIphoneOwnerAttestation: false` and excludes external A/V sync measurements. A simulator or forged report cannot be silently interpreted as a real iPhone pass.
6. Existing Guardian rig, soundtrack and world runtime remain fail-closed. Any missing model yields `modelBound=false`, not a fabricated result.

## Real-device acceptance experiment — proposed thresholds
The following thresholds are acceptance criteria, **not measured results**.

| Test | Requested evidence | Proposed pass target |
|---|---|---|
| Model identity | Final GLB SHA and founder-approved front, 45°, left + right 90° profile images against same rig | Exact hash, no visible continuity defects |
| Real physical iPhone | Model name, device iOS build, app version and private exported JSON | Real iPhone, non-simulator; separate owner witness |
| Live 30s playback | 30+ seconds of uninterrupted voice, 16 morph target mapping, stop/mute tests | ≥ 30 observed FPS; p95 frame gap ≤ 50 ms; zero rendering failures |
| Face phoneme timing | Genuine iPhone video captured externally at ≥ 60 fps with audible source waveform | Mean absolute mouth/audio offset ≤ 100 ms after manual cross-correlation |
| Scene recovery | Background/foreground, incoming phone call, mute and pause | Mouth always resets to neutral; no stale audio session |
| Other areas | World navigation and 10 portal memory stress | No crash across 10 repeated transitions |

**Evidence warning:** JavaScript frame telemetry by itself is not hardware certification and cannot measure actual sound-to-visible-mouth delay; a real externally captured synchronized audio/video sample is required. If final accepted GLB is absent, all morphology/device QA remains **NO-GO**.

## How to run
1. In a private owner-managed EAS checkout, stage the real final accepted GLB and its independent rights/founder receipt, plus exact approved original soundtrack. Never publish those protected assets.
2. Set `EXPO_PUBLIC_GUARDIAN_DEVICE_QA=1` only for a manually approved *internal iPhone QA build*. Do not change Apple signing checks or founder TestFlight approval gates.
3. Use a real iPhone (not the simulator) to open the Hub, start authorized Guardian speech, observe facial animation and capture a high-frame-rate external A/V recording.
4. Tap **Capture frame QA** followed by **Export QA**; save the JSON using the local iOS share sheet. Do not send the report anywhere until reviewed.
5. Compare the JSON and external recording with the proposed thresholds; do not mark accepted without exact model SHA and independent reviewer signoff.

## Current hard blockers
- Build 222 private candidate is an actual newly sculpted and retextured GLB, but multiview inspection still visibly fails an accurate face/armour photo-reconstruction test. It remains private and NOT approved for this code path.
- No authenticated Expo cloud archive, signed IPA, real-device session, external 60fps A/V clip, or founder acceptance for this candidate exists. No device outcome has been fabricated.

## Operational control
The app's regular 2D Guardian remains unchanged. Compiled QA flag is off for public builds. Further audio/model work must adhere to the user's no-substitution and CAD $0 no-credit policies.
