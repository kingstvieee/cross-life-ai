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

## Production keyframe correction
- First portal-design keyframe is sharp and carries the central STAARWAARDD title, but fails the required hover pose: it depicts forward flight and an overly narrow vertical portal. Do not animate it.
- Submitted one corrective keyframe `1b3f5adf-8a83-49ad-a5c2-b04c07d87616`: original Guardian upright and vertical in midair, feet hanging, theatrical hands visible; single broad horizontal gold rounded world-window beside him. Toronto/CN Tower and central brand title retained.
- New spend is now 40 of the hard 100-credit cap; 60 remain. Corrected keyframe QA and any motion render remain pending. No new final master or full opening approval is claimed.

## Authorized five-second animation and full review assembly
- User selected five seconds: hover, then theatrically open one portal, and requested the full video.
- Submitted motion task `0c44cc1d-fc5d-4341-a286-9395ad4c2e9f` from selected upright keyframe `1b3f5adf-8a83-49ad-a5c2-b04c07d87616`. One five-second render cost 60 credits. Cumulative new spend is exactly 100/100; zero remains. No further generation, upscale or retry is authorized.
- Assemble the preserved existing action through the technical 25.50s handoff with the new five-second shot, reusing sound-corrected review audio across the full cut. This replaces the rejected appended ending; original files remain rollback.
- This full-length review is not an approved final master: original-opening softness, pre-handoff character/costume drift, seam quality and new motion must still be assessed. Do not claim COMPLETE or deploy based on generation success alone.

## Full opening magic review delivered
- Saved `Guardian_Full_Opening_Magic_Review.mp4` (`libfile_720dc860bb5481919abb88e3d96f0a7f`): 30.500s, 720×1280 H.264, stereo AAC; full decode completed without errors.
- Structure: existing opening action to the technical 25.50s handoff, then a five-second portal shot. The prior six-second clarity pass is reused in the prefix; original files remain untouched.
- The raw five-second motion render introduced a second portal and an out-of-frame exit. Locally reused only its first 3.00s, retimed into five seconds, preserving the upright hovering Guardian and single portal. Added non-generative hand-energy trails, sparks, portal light burst, a stable typeset STAARWAARDD ending title, and a moving world interior derived from the existing fantasy-city footage.
- Reused existing music continuously; locally synthesized a riser/shimmer/impact and mixed stereo with output limiting and end fade. No additional generation credits spent on compositing or sound.
- Budget remains exactly 100/100 new credits spent. No retries or further paid work authorized.
- This is a full review cut, not COMPLETE: softness and identity/costume drift in the preserved opening and the abrupt visual handoff remain unresolved. Do not wire this review into production or treat export success as visual approval.

## Additional 40-credit continuity repair — October 12
- User rejected the cloud transition as looking like two separate videos and authorized at most 40 additional credits. This supersedes the prior stop only within this new allowance.
- Spent 8 credits on original-opening-reference anchor task `402d5743-af22-4899-b0ff-8f8e1440b462` and 25 credits on five-second motion task `e17dbe98-fa10-4d73-a64c-98d63d4bcc40`: 33/40 additional credits spent, seven remain. Connected balance fell from1927 to1894. A two-credit image-edit request was rejected for invalid dimensions before task creation; no debit was observed.
- Motion QA rejected generated frames after the stable opening: they introduced a second gateway and removed the Guardian from view. Those frames are excluded from the review.
- Revised review replaces conflicting storm/cloud and sky/finale shots: source action14–17s is retimed across14–21s; only stable initial1.05s of the new hover is reused as a gentle idle loop for21–30.5s. Detached duplicate CN Tower is removed with neighbouring source sky. One rounded gold world-window, hand-energy ribbons, sparks and central STAARWAARDD title are composited locally. World interior reuses existing footage.
- Saved revised playback review `Guardian_Continuity_Repair.mp4`, Library identity `libfile_a5514f31d0648191963f318da8997404`, version1:30.500s,540×960 H.264 Constrained Baseline with AAC stereo, full decode verified. Portal begins at25.50s; existing continuous audio is retained.
- This is a review revision, not final acceptance. Theatrical arm/wrist/finger movement remains insufficient; original opening softness and exact identity consistency require user visual approval. A0.25s dissolve at21s and repeated idle source frames do not satisfy the locked no-dissolve/fully-active motion gate.
- Canonical source, assembly script,25.50s technical handoff and duration-aware playback implementation are unchanged. No runtime assets, app wiring or production deployment were changed.

## Screenshot quality rejection and native export — October 12
- User supplied IMG_2247.jpeg showing smeared face, armour and feather detail in the flight shot around10s. The540p playback export added downsampling loss; source720p footage itself is also visibly soft.
- Submitted exactly3.00s from source9–12s to upscale task `3a19ad95-756d-4f70-9438-f344a02bb9f2`, cost6credits. This brings the additional allowance to39/40 spent, one remaining. No regeneration/retry or full-cut upscale was submitted.
- Output2304×4096,3.00s. Matched-frame comparison at source10s shows smoother compression/edges, but facial detail remains indistinct. Upscale does not pass the clarity gate and is not evidence of recovered identity detail.
- Reassembled the latest review at native720×1280 with high-quality H.264 encoding and192kbps stereo AAC, retaining30.500s duration and25.50s portal onset. Saved `Guardian_Source_Quality_Review.mp4`, Library identity `libfile_a5514f31d0648191963f318da8997404`, version2,25,712,510bytes; full decode verified.
- Quality remains rejected pending a sharper original or a properly reference-locked replacement of damaged footage. Do not call this full clarity, COMPLETE, approved v5, or deploy it. Technical implementation is unchanged.

## Requested4K delivery and15-credit allowance — October12
- User authorized at most15 further credits after the39/40 repair spend, in response to the4K-quality discussion. New allowance spend is0/15; no paid task was submitted.
- Created separate `Guardian_4K_Review.mp4` (`libfile_a882a84cd04c8191b023fe51b78ca436`),2160×3840,20fps H.264 High with AAC stereo,30.500s,35,953,820bytes. Full decode passed.
- Reused actual restored4K footage for0–6s and9–12s; remaining720p footage/composites are conventionally scaled. This is a4K delivery raster, not a native4K acquisition or recovery of missing facial detail.
- Original source clarity defects and limited theatrical hand motion remain unresolved. Preserve all approval gates; no final acceptance, runtime wiring or deployment claimed.25.50s portal cue and technical implementation remain intact.

## User rejection of still-loop workaround and recovered motion audit — October12
- User explicitly rejected the idle-loop ending as still pictures instead of live film. Continuity Repair, Source Quality Review and4K Review are rejected production candidates; their loop-based ending must not be reused or approved. Canonical production wiring remains unchanged.
- Recovered signed-in MagicLight Staarwardd project `7510513657379639298`, STAARWAARDD GUARDIAN: The Toronto Genesis. It is a Cast-stage draft, not an assembled Guardian timeline. Advancing displayed3300credits and was not submitted. Toolbox historical video gallery showed episode assets; no usable Guardian continuation was found there.
- Recovered signed-in LTX project `93622f1c-9fff-479e-b8b6-3086175aacbb`, Guardian Of Gateways session `98c157f2-6b8c-469b-97d8-6b5060bd25f3`. Downloaded and visually audited existing third10.28s and fourth16s motion takes without spending credits.
- Third take has active theatrical hands but camera/world travel replaces Toronto and uses circular nested portal treatment. Fourth opens multiple world windows together. Both fail current portal/setting gates and cannot be used as approved continuation. Glowing Street Magic contains the separate tracksuit/transformation material, not a sharper matching replacement of the existing winged opening.
- LTX displays0% credits. No new generation submitted on any service. Latest15-credit allowance remains0/15 spent.
- Full repair remains blocked by absent compliant motion footage and insufficient budget for a new five-second Runway take (minimum25credits at the verified5credits/second tier). Do not imply25credits guarantees a successful repair; prior cheap motion output failed QA. No still/loop substitution, stretched master, export-only quality claim or completion claim permitted.

## Final authorized25-credit motion attempt — October12
- User authorized increasing the latest allowance from15 to25 total and explicitly stated no more credits afterward. Submitted exactly one five-second motion take `c5f236e7-0186-4863-8549-4e0c23d57dbd`, starting from original opening identity frame. Cost25credits; connected balance1709→1684. Latest allowance25/25 spent. ALL further paid generation, retries, edits and upscales are prohibited unless separately authorized later.
- Raw take720×1280,5.041667s. Inspected adjacent/time-sampled frames across the whole take: one gold portal, Guardian remains visible and airborne, Toronto/CN Tower retained. Real camera/body motion replaces the rejected idle loop, but hand performance is restrained, pose remains partly forward-leaning, and local costume/chest detail warps are not final-approval quality.
- Locally composited moving world footage into the single blue aperture, cropped below any actor in the source to prevent a duplicate Guardian, plus restrained source-tracked hand trails and correctly spelled STAARWAARDD title. No paid compositing or audio work.
- Reassembled full review from original normal-speed action through25.50s plus exactly five native seconds of the new motion, played once without actor looping, holding, slow-motion stretching or cloud-ascent retiming. Existing first6s and9–12s restored sections are reused; continuous soundtrack remains.
- Saved `Guardian_Full_Motion_4K_Review.mp4`, Library identity `libfile_a882a84cd04c8191b023fe51b78ca436`, version1:2160×3840,20fps H.264 High/AAC stereo,30.500s,36,709,667bytes. Full decode verified.
- This is a4K delivery raster, with lower-resolution sections scaled, not a recovered native4K source. Original-opening softness and pre-handoff identity/costume drift remain unresolved, and the dominant theatrical gesture gate remains unmet. Do not mark COMPLETE, wire to canonical startup, deploy or treat generation/export success as approval. Technical timing/assembly/playback implementation remains unchanged.
