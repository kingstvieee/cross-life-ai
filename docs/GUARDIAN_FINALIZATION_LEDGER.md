# Guardian Finalization Ledger

Updated: 2026-10-02

## Verified existing production state
- Canonical opening specified as `frontend/public/video/guardian-launch-synced-v4.mp4`, 720×1280, about 29s.
- Preserve the opening through approximately 26.20s unless QA identifies a cleaner adjacent handoff.
- Existing final ~3s with small circular world icons must be replaced.
- MagicLight production brief is now locked at `docs/GUARDIAN_MAGICLIGHT_FINAL.md`.
- Required final master filename remains `frontend/public/video/guardian-launch-continuous-v5.mp4`.
- Missing production dependency remains an **approved continuation video** beginning from the existing Guardian handoff and matching the same identity.

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
