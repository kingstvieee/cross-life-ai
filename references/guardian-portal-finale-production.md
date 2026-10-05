# Guardian portal finale — production brief

## Source and splice

- Canonical opening: `frontend/public/video/guardian-launch-synced-v4.mp4`, 720 × 1280, 29 seconds. Preserve frames before 26.00 seconds.
- Continuation start frame: export at 26.00 seconds. The Guardian is airborne over a recognizable Toronto skyline with the CN Tower behind him, wings extended, silver/gold armour and the glowing maple chest sigil intact.
- The original final three seconds show a large portal and small circular world icons. Replace those seconds with the approved moving finale. The icons are not the requested gateways.
- Render one continuous moving continuation, ideally 15–20 seconds. If generation requires two clips, use the last frame of the first as the start of the second and join them without a visible jump. Render portrait 9:16, at least 720p; keep the app soundtrack separate.

## Shot direction

**0–3 seconds:** Continue the source pose and momentum. The same Guardian rises higher over Toronto. Wings, cloth, arms, facial expression, clouds, and camera all move continuously. Wind gathers, real buildings retain parallax, and the CN Tower remains the geographic anchor. His face and armour do not change.

**3–11 seconds:** He conducts seven distinct casts with his hands and body while still airborne. Each cast travels visibly through world space and tears open one monumental dimensional gateway: Creativity, Work, Home, Wellbeing, Relationships, Community, Style. Gateways have depth, moving inner worlds, swirling edges, lightning interaction and scale against the city. They occupy different positions in the Toronto sky, never a row of icons, cards, still photos, or a flat interface. The camera moves around him without cutting away from this continuous action.

**11–15+ seconds:** All seven gateways stand open around the airborne Guardian. Storm and gold/violet energy peak; Toronto and CN Tower remain visible. Camera pushes through the centre opening in one motion, matching the live Hub's central Guardian and seven-world spatial layout. End on the moving camera transition, with a frame that can hand off to the Hub without a freeze or splash screen.

## Generation prompt

Continue directly from the supplied first frame of the existing STAARWAARDD Toronto Guardian film. This is one uninterrupted photoreal cinematic shot in continuous time. Preserve the exact same adult Black male Guardian face, short fade, skin tone, natural proportions, silver and gold armour, glowing maple leaf chest sigil, large feathered wings, lighting and Toronto skyline. He remains visibly airborne and physically active throughout, rising and turning his torso, wings beating with weight, both arms conducting seven separate dimensional casts. Gathering storm clouds, pressure in the wind, lightning that responds to his hand motions, moving traffic and building parallax. The CN Tower remains unmistakably visible. Each cast travels from his hand into the sky and tears open one of seven monumental, three-dimensional gateways at different depths around him. Each portal has a living interior world and an energized rotating rim; the gateways appear one by one and remain open together. No circular menu icons, cards, picture panels, static images, cutout Guardian, montage, hard cuts, dissolves, text, titles, logos, extra people, face changes, new costume or generic futuristic city. Keep the Guardian and Toronto in the same continuous camera move. Finish with all seven open, then a forward camera move through the central energy field toward the live seven-world Hub. Premium sharp cinematic motion from first frame to last.

## Approval gate

Review the first five to ten seconds after the splice before integrating the entire finale. Fail if the face changes, Toronto disappears, the Guardian freezes, portals resemble UI cards, or a cut interrupts the motion. Review the whole seven-portal reveal and the exact Hub handoff at mobile and desktop sizes. The assembled output must be visually approved before replacing the app's source video.

## Assembly

Once the continuation passes review, run `frontend/scripts/assemble-guardian-finale.sh approved-continuation.mp4 frontend/public/video/guardian-launch-continuous-v5.mp4`. Then wire the web and native launch sources to the same approved asset, remove the still-image arrival sequence from the entry path, and run the full start-to-Hub preview. The script checks portrait dimensions and duration and cuts on the exact 26.00-second continuation frame with no dissolve. It never treats a test clip as an approved asset.
