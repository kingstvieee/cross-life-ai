# STAARWAARDD — Guardian Opening Final Continuation Package
Status: LOCKED FOR MAGICLIGHT PRODUCTION
Date: 2026-10-02
Owner: STAARWAARDD
Canonical repo: kingstvieee/cross-life-ai

## Objective
Finish the app opening as one seamless cinematic summon. The final experience must feel like one uninterrupted piece from the existing Guardian launch footage through the portal finale and into the live Hub.

The user-approved intent is:
1. App starts.
2. Guardian is summoned as part of startup, not inserted afterward.
3. Existing Guardian opening continues without a visible reset.
4. Same Guardian remains on screen with exact identity, hair, suit, lighting and proportions.
5. Guardian deliberately creates seven monumental portals.
6. Portals resolve into the final seven-world layout.
7. Camera moves through the central portal into the live Hub.
8. No second-video feeling, no abrupt visual-quality change, no substitute Guardian.

## Canonical Source
Primary opening file:
`frontend/public/video/guardian-launch-synced-v4.mp4`

Source properties already established:
- portrait 9:16
- approximately 29 seconds
- current approved handoff region: around 26.0 seconds
- Guardian airborne over Toronto
- CN Tower visible
- wings extended
- silver / white / gold armor
- glowing maple-style chest sigil

Preserve the existing source from 0.00 through approximately 26.20 seconds unless QA proves a cleaner adjacent cut point.

## Identity Lock — NON-NEGOTIABLE
The continuation must preserve:
- exact same face
- same skin tone
- same short dark hair and hairline
- same facial proportions
- same age
- same body proportions
- same silver / white / gold winged Guardian suit
- same wing architecture
- same chest-sigil design and glow language
- same cinematic Toronto lighting
- same clarity and skin/detail rendering

Do not:
- change hairstyle
- smooth or reshape the face
- change jaw, nose, eyes, lips, brow or facial hair
- turn the Guardian into a generic superhero
- replace armor with robot / iRobot-style plating
- create a second Guardian
- change body size
- switch to a different actor-like face

## MagicLight Master Prompt
Continue directly from the supplied final frame of the existing STAARWAARDD Guardian opening.

This is ONE UNINTERRUPTED CINEMATIC SHOT. Maintain the exact same Guardian from the supplied reference: identical face, short dark hair, hairline, skin tone, facial structure, body proportions, silver-white-gold futuristic winged suit, mechanical-magical wings, glowing chest sigil, material texture, Toronto lighting and image clarity.

The Guardian is already airborne over a recognizable Toronto skyline. The CN Tower remains a clear visual anchor in the background. Preserve continuous camera motion, skyline parallax, wind movement, subtle hair movement, cloth movement, wing movement, breathing and natural facial micro-movement. The Guardian must never freeze into a still image.

The Guardian rises slightly while the camera continues its existing movement. He looks toward the space around him and begins a deliberate magical summoning sequence using both hands and body movement. Each portal is visibly created by his gesture and energy. Portals must NOT already exist before he summons them.

Create exactly seven distinct monumental three-dimensional magical gateways:
1. Creativity
2. Work
3. Home
4. Wellbeing
5. Relationships
6. Community
7. Style

Each gateway must feel architectural, deep and physically present in the Toronto sky around the Guardian, with a living interior world visible through it.

CREATIVITY: artistic maker world, luminous studio, art materials, design energy, expressive color and craft detail.
WORK: sophisticated modern work environment, focused, premium, productive, intelligent, organized.
HOME: warm intelligent home world, subtle day/night environmental cues, fireplace/night or bright green daytime environment, comfortable and alive.
WELLBEING: serene temple, water, nature, meditative architecture, subtle wellness atmosphere.
RELATIONSHIPS: warm elegant social world, romantic but refined, connection-oriented, welcoming.
COMMUNITY: lively event/community environment, human-energy atmosphere without crowd clutter, sense of local discovery and belonging.
STYLE: premium personal wardrobe / fashion world, elegant closet architecture, luxury styling environment.

The seven portals form around Guardian progressively. Each one appears only after a distinct Guardian gesture. Keep Guardian continuously visible and moving while portals form.

Portal design:
- monumental, cinematic, magical architecture
- thick dimensional rims
- deep perspective
- moving internal environments
- volumetric light
- glowing energy that feels physically present
- premium fantasy-tech finish
- no flat circles
- no app icons
- no cards
- no UI tiles
- no floating screenshots
- no text labels in the generated footage

By the end, all seven gateways remain open together in a balanced spatial formation around Guardian. Toronto and the CN Tower remain visible so this never becomes a generic fantasy city.

Final movement:
The camera begins a smooth forward push toward the central portal. Guardian remains visually continuous and alive. Use the portal itself as the transition mechanism into the live STAARWAARDD Hub. The final frame should be designed for a clean app handoff, not a fade to black.

## Negative Prompt / Failure Prevention
NO different face.
NO new hairstyle.
NO longer hair.
NO shaved head.
NO beard changes.
NO different skin tone.
NO different Guardian costume.
NO bulky robot armor.
NO generic futuristic city.
NO New York skyline.
NO missing CN Tower.
NO static Guardian.
NO still-image section.
NO freeze frame.
NO second Guardian.
NO duplicated body.
NO montage.
NO hard cut.
NO dissolve between actors.
NO visible stitched-video seam.
NO UI cards.
NO circular app thumbnails.
NO text.
NO portal labels.
NO logos inside generated continuation.
NO random extra people.
NO abrupt color-temperature change.
NO gritty first-half / glossy second-half mismatch.
NO sharpness drop.
NO low-resolution face.
NO plastic skin.
NO morphing hands.
NO malformed wings.

## Timing
Target continuation: 15–20 seconds.

Suggested beat map:
- 0.0–2.5 s: exact handoff, Guardian remains airborne, slight rise, continuous Toronto parallax.
- 2.5–10.5 s: seven deliberate summoning gestures. Portals form progressively.
- 10.5–14.0 s: all seven portals stabilize around Guardian, Toronto remains visible.
- 14.0–18.0 s: camera pushes toward central portal for Hub transition.

Do not force every beat to a rigid timestamp if motion quality suffers. Continuity outranks clock precision.

## Quality Target
Production target:
- render at the highest available MagicLight Pro quality
- preserve high facial detail
- high bitrate
- stable temporal detail
- no excessive denoising
- no artificial beauty smoothing
- no frame interpolation artifacts around face, fingers or wings

If MagicLight supports native 4K for this workflow, use 4K.
If its generation path tops out below 4K, generate the cleanest high-bitrate master first and only upscale AFTER identity/portal QA passes.

A fake 4K upscale does not count as approval if the source contains face morphing or portal artifacts.

## Reference Priority
Reference order:
1. Existing final approved opening frames immediately before handoff
2. Guardian primary full-body reference
3. Guardian transformation / armor board
4. Steven frontal identity reference
5. Steven profile identity reference

The existing moving Guardian at the handoff point outranks generic stylistic references.

## Assembly Rule
Do not make the user watch:
Opening video -> obvious stop -> unrelated second clip -> UI portal animation.

Required final structure:
ONE VIDEO MASTER:
existing opening + frame-matched continuation + portal push-in

Then:
ONE APP HANDOFF:
master video ends into live Hub.

No duplicate arrival cinematic after the final master is installed.

## Final Master Filename
Use:
`frontend/public/video/guardian-launch-continuous-v5.mp4`

Keep the previous approved source file untouched as rollback:
`frontend/public/video/guardian-launch-synced-v4.mp4`

## App Wiring After Render Approval
Once `guardian-launch-continuous-v5.mp4` is approved:
1. Change LaunchSequence web source to the v5 master.
2. Add equivalent native asset.
3. End LaunchSequence directly into the live CinematicHub.
4. Disable the separate HubArrivalCinematic during canonical startup, because its portal material is now embedded in the master.
5. Keep a skip control and reduced-motion path.
6. Keep soundtrack continuity across the handoff.
7. Preserve direct /hub fast path.

## Approval Gate
Do not mark opening COMPLETE unless every item passes:
- same Guardian face before and after handoff
- same hair and hairline
- same armor/suit
- same wings
- Toronto identity preserved
- CN Tower preserved
- no visible resolution/clarity jump
- no color-grade jump
- no freeze/still section
- all seven portals present
- portals are 3D worlds, not UI cards
- Guardian visibly summons portals
- one continuous moving shot
- camera push ends naturally into Hub
- no black-frame flash
- no audio pop
- final app launch shows only one coherent cinematic sequence

## Completion Definition
The opening is COMPLETE only when:
- final master exists
- final master passes QA
- app is wired to final master
- production deployment is READY
- live deployment is watched from start to Hub
- there is no duplicate arrival sequence
- visual quality is accepted
