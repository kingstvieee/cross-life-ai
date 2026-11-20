# DIGGITSTAAR — cinematic media integration gate

The native `/diggitstaar` Studio is retained: 3D seated workstation, touchscreen routing, local clients/leads/workload, and read-only Gmail OAuth flow remain unchanged. This change introduces an optional owner-approved 4.71-second cinematic entrance. Until exact corrected media is installed, the source gate stays disabled and the current app remains functional; **no alternate/placeholder scene is shown**.

## Stage approved media before building

Use the ZIP from the ChatGPT DIGGITSTAAR handoff named `DIGGITSTAAR_HOLOGRAPHIC_QA_FIXED_STAR_HUB_INSTALLER.zip`.

```bash
python3 scripts/stage_diggitstaar_cinematic.py /path/to/DIGGITSTAAR_HOLOGRAPHIC_QA_FIXED_STAR_HUB_INSTALLER.zip
python3 scripts/stage_diggitstaar_cinematic.py --check
cd frontend && ./node_modules/.bin/tsc --noEmit
```

The installer checks SHA-256 for BOTH source videos and requires the exact corrected originals. If either is missing or altered, it exits before edits. Successful installation adds only two MP4s and enables the static Expo imports in `diggitstaar-cinematic-sources.ts`. Re-entry shows the corrected video with mute and skip options and then enters the real 3D studio. An 8.5s fallback prevents playback deadlocks; native reduce-motion/device QA still required.

**No EAS build is authorized by this staging task.** Avoid using a free build slot until GitHub source, media, native compiler, authentication and physical iPhone checks are all green. Do not modify the existing locked Guardian startup film or audio.

## Production evidence status

- Local pre-staging TypeScript and five DIGGITSTAAR regression tests pass on the working candidate.
- 2 cinematic MP4 assets are **NOT** on this Git branch until ZIP import. The downloaded ChatGPT artifacts cannot be assumed accessible from the cloud computer.
- OAuth transport code exists in the Studio; provider connection/actual Gmail readback are separate certification gates. Video generation is NOT authorized/verified.
- WorldScene is a 3D WebView runtime; its actual real-device performance is not certified by a clean TypeScript run.
