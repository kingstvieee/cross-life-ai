# Offline portal geometry continuation

This isolated branch adds a real Three.js scene renderer for the portal chamber
and nine destinations: residence, Work, Dreams, Health, Love, Village, Closet,
STARVERSE and STAARSONIC. Scene furniture, portals, skyline, console, wardrobe,
floating islands and headphones are mesh geometry, not projected reference PNGs.
The music-studio headphones complete one revolution in 30 seconds. Reduced-motion
mode renders on interaction without continuous decorative animation. Hidden pages
pause rendering; controls and GPU resources are disposed on page exit.

The locked PNGs, existing homepage and existing world screens are preserved.
The added `/environment?world=...` route is separate; this branch does not declare
visual parity with the locked artwork. Full production
set dressing, Guardian identity mesh/facial rig, viseme synchronization and
physical-device rendering acceptance remain unfinished. It must not replace the
approved default screens before those gates pass.

## Isolation

- The bundled 609 KiB HTML renderer has no API credentials or account context.
- Its content security policy allows local inline code and canvas textures only;
  no network connection is permitted from the renderer.
- Web uses a script-only sandboxed iframe. Messages must originate from its
  own iframe window and match the selected world.
- Native uses the existing WebView dependency, blocks navigation away from the
  local document, and denies file/universal file access.
- Renderer messages may request only allowlisted local navigation. They cannot
  execute a home command, open arbitrary URLs, transmit account data or mark any
  task complete. Connection setup and conversation review remain in the host app.

## Rebuild and evidence

`npm run scene:build` in `frontend` installs the integrity-pinned Three.js and
esbuild build dependencies, then generates the offline HTML and TypeScript module.
Generated files are ignored by git and rebuilt during install/CI.

Validated locally: scene bundling, JavaScript syntax, whitespace/diff checks, and
8 account-storage, home-adapter and renderer-navigation tests. TypeScript/export
and visual checks must be recorded separately when completed.

The initial source is published in draft PR #36, head 00db5a2. Its security,
TypeScript, web export and unsigned iOS/Watch simulator compilation passed.
Vercel reports an account block; no deployment or signed IPA is claimed.

November 15 continuation adds a separate Singles Lounge variant to the Love
route, selected explicitly through a visible switch, without inferring personal
relationship status. Its obsidian leather lounge, ultraviolet stage, chandelier,
circular fire and mirrored bar are mesh geometry. Human figures, lion sculpture,
Guardian identity rig and full reference-art fidelity remain unfinished.

The desktop preview loaded the offline page but WebGL initialization failed.
This is not visual acceptance. Devices without WebGL now retain allowlisted
navigation controls instead of an empty scene. No security flags were weakened.
The original renderer and host navigation regression tests remain required.
