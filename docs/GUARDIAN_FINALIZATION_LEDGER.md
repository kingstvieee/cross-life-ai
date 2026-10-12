# Guardian Finalization Ledger

Updated: 2026-10-12 (Toronto)

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

## October 7 production-direction synchronization
- Updated only this ledger and the locked continuation brief to the latest visual direction; technical assembly/playback code and existing test results are unchanged.
- Keep the previous/correct Guardian with only the requested light face adjustment and lowered short hair treatment with exactly two swoosh-like lines.
- Guardian remains airborne while opening one portal at a time, with dominant theatrical hand magic and visible living worlds. The exact-seven render requirement and simultaneous gateway finale are superseded.
- Preserve source footage through the 25.50s handoff unchanged; face/hair adjustments must pass seam QA without an abrupt morph. Confirm supplied likeness/hair references before any paid continuation generation.
- No new generation, assembled master, visual approval or production acceptance is claimed by this documentation update.

## October 12 review rejection and repair status
- The latest sound-corrected review is 35.80s, 720×1280 with stereo AAC audio. Sampled frames show soft early footage and chest-emblem/armor changes before the final portal section; do not assume only the appended finale needs repair.
- Latest direction supersedes the October 7 face/hair adjustment permissions: retain the exact Guardian from the beginning through the end. Same face, hair, body proportions, armor, wings and chest emblem.
- Keep the world-interior concepts; portal shape/layout was pending at this audit; the subsequent supplied reference resolves it as recorded below.
- A conservative denoise test of the opening was created without generation credits; inspected result remains too soft to claim full clarity. It is an unapproved working test, not a final master or identity repair.
- LTX access restored for Staarwardd; displayed credit indicator is 0%. No generation was started.
- Technical 25.50s assembly handoff and duration-aware playback fixes remain unchanged. Preserve rollback sources; source identity repairs must be visually accepted before assembly.

## MagicLight continuation gate
PASS only if all are true:
- exact Guardian from the beginning retained throughout; identical face, hairstyle/hairline, skin tone, body proportions, armor, chest sigil and wings;
- full-size early footage is clear without grain/compression artifacts or invented face detail;
- portal frame designs match the supplied gold rounded world-window reference, without copying the collage/dashboard layout;
- central STAARWAARDD title is correctly spelled, stable and clear of face/hand magic;
- clean 25.50s technical handoff preserved, with no identity or costume drift before, during or after the moving seam;
- Toronto remains continuous and CN Tower stays visually coherent;
- Guardian stays physically active with body, wings, hair, cloth, camera, clouds and city parallax moving;
- Guardian remains airborne while dominant, thrilling hand magic and theatrical arm, wrist and finger gestures visibly summon each portal;
- revealed destinations use the established Creativity, Work, Home, Wellbeing, Relationships, Community and Style vocabulary as deep windows into living worlds, not UI circles/cards; no exact-seven reveal requirement;
- only one gateway is open at any instant; close it fully before opening another, and leave only the single final gateway active for the Hub transition;
- no hard cut, freeze, dissolve, unrequested face redesign, costume mutation, duplicate Guardian, random extra people or generic city;
- final camera push moves into the single final active portal toward the live Hub;
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

## Runway repair budget and clarity checkpoint — October 12
- Latest authorized budget: at most 100 new Runway credits from the user's top-up authorization; supersedes the earlier 27-credit cap. Workspace balance is not a spending authorization.
- Six-second original-opening upscale task `7670e6a9-fa79-443c-9c00-4e1a7e690fb4` completed: 2304×4096, 25fps, 6.016s, stereo audio. It cost 12 credits before the 100-credit authorization.
- Frame comparison shows smoother footage but persistent facial softness. This is not final clarity approval or an identity repair.
- Recovered repository `guardian-toronto-traverse-hd.mp4`: despite its name it is 720×1280, 20fps, 29s and silent. It does not establish a sharper original.
- New spend since the 100-credit authorization: 0; authorized budget remaining: 100. No full-upscale duplicate, character edit or portal generation submitted.
- Portal geometry still awaits the user's forthcoming layout reference. Keep the world-interior concepts, airborne Toronto/CN Tower setting and one-portal-at-a-time direction; do not guess the layout.

## Supplied portal-design reference — October 12
- User supplied `2A825DC7-445D-476C-97E9-D72BFB55AC9D.jpeg` and clarified: use only the portal designs and middle name, with Guardian hovering centrally in midair. Reference does not replace the original Guardian or authorize copying the whole layout.
- Resolved design: dimensional sculpted gold frames, broad curved corners, rounded rectangular windows into living worlds. Central title: STAARWAARDD. Keep Toronto/CN Tower and one portal at a time; omit dashboard controls and small labels.
- Submitted one 2K reference-anchored production keyframe: Runway task `05d31460-0f8c-4aa4-8835-a2351d6d04d2`. References: original beginning Guardian frame plus supplied portal-design image. Identity QA and motion generation remain pending.
- Credit accounting: 20 of the newly authorized 100 spent; 80 remain. Earlier 12-credit upscale remains outside this new cap. No retries submitted.
- Prior pending-reference entries are historical. The design reference is now available; do not continue treating its absence as a blocker.
