# Guardian Finalization Ledger

Updated: 2026-10-05 (Toronto)

## Verified existing production state
- Canonical opening specified as `frontend/public/video/guardian-launch-synced-v4.mp4`, 720×1280, about 29s.
- Preserve the opening up to the audited 25.50s handoff. The previous 26.20s point already includes the rejected circular Creativity overlay.
- Existing final ~3s with small circular world icons must be replaced.
- MagicLight production brief is now locked at `docs/GUARDIAN_MAGICLIGHT_FINAL.md`.
- Required final master filename remains `frontend/public/video/guardian-launch-continuous-v5.mp4`.
- Missing production dependency remains an **approved continuation video** beginning from the existing Guardian handoff and matching the same identity.

## October 5 continuation work
- Verified main still ends at `ffa71a00b70e6711ad8792a1e4dfc2e98207952f` (October 2). No later GitHub update was present at the start of this work.
- Probed the actual v4 source: 29.00s, 720×1280, 20fps, no embedded audio. Its native source and WebM fallback still reference the earlier traverse assets; both require the approved v5 equivalent before switching.
- Inspected source frames at 25.50s, 25.75s, 26.20s and 28.00s plus adjacent-frame thumbnails. Selected 25.50s as the clean continuation reference before the old portal reveal/label sequence. This is a source-frame audit, not approval of a generated continuation.
- Restored the documented assembly script. It validates portrait dimensions and continuation duration, assembles one silent H.264 master at source resolution/frame rate, checks output duration, and refuses to overwrite inputs or an existing master. Synthetic tests do not constitute visual approval.
- Replaced the fixed 45s launch cutoff with a metadata-aware deadline (minimum 60s, otherwise decoded duration + 15s), and clear launch timers on unmount.
- Current opening, native source, codec fallback and separate arrival remain active until the approved master is supplied. No v5 render was generated or deployed.

## Technical validation commands
- `node --test frontend/scripts/test-launch-playback.mjs` (Node 22.18+ for native TypeScript support)
- `python3 frontend/scripts/test-guardian-assembly.py` (requires FFmpeg/FFprobe)
- `cd frontend && npx tsc --noEmit`
- `cd frontend && npx expo export --platform web`

Assembly tests use temporary synthetic media and verify duration, format, unchanged inputs, existing-output protection, and rejection of missing, short and landscape continuations. They never create the canonical v5 filename in the repo.

Validation result for this branch: all three launch deadline tests and both assembly tests passed; shell syntax and `git diff --check` passed. Full frontend typecheck and Expo web export remain unverified: frozen-lockfile installation stalled while fetching packages, including a retry using the npm registry. No dependency versions or lockfile were changed. Keep this as a draft PR pending full frontend checks and the visual continuation gate.

## MagicLight continuation gate
PASS only if all are true:
- exact same Guardian face, haircut, skin tone, body proportions, armor, chest sigil and wings;
- Toronto remains continuous and CN Tower stays visually coherent;
- Guardian stays physically active with body, wings, hair, cloth, camera, clouds and city parallax moving;
- seven portals are visibly summoned by Guardian gestures;
- Creativity, Work, Home, Wellbeing, Relationships, Community and Style appear as monumental dimensional gateways, not UI circles/cards;
- gateways remain open together;
- no hard cut, freeze, dissolve, face change, costume mutation, duplicate Guardian, random extra people or generic city;
- final camera push moves into the central portal toward the live Hub;
- portrait 9:16;
- highest clean MagicLight Pro render quality available;
- continuation target 15–20s.

## Quality rule
The source must first pass identity and continuity QA. Upscaling does not rescue a bad generation. A sharp wrong face is still the wrong face, because apparently this needs writing down for machines.

If MagicLight supports native 4K for the chosen workflow, use it.
If not, create the cleanest high-bitrate master first, approve continuity, then upscale the approved master.

## Assembly command after approval
`frontend/scripts/assemble-guardian-finale.sh approved-continuation.mp4 frontend/public/video/guardian-launch-continuous-v5.mp4`

## App wiring after approved master exists
1. Point LaunchSequence web source to `guardian-launch-continuous-v5.mp4`.
2. Add the equivalent native master asset.
3. LaunchSequence ends directly into the live CinematicHub.
4. Disable the separate HubArrivalCinematic during canonical startup so the user sees only one cinematic.
5. Keep soundtrack continuity, skip control, reduced-motion behavior and direct `/hub` path.

## Final acceptance
Do not mark opening COMPLETE until:
- approved continuation exists;
- assembled v5 master exists;
- visual QA passes;
- app is wired to v5;
- production deployment is READY;
- live deployment is watched from first frame through Hub;
- no second-video feeling remains;
- no clarity, identity, portal-design or audio handoff defects remain.
