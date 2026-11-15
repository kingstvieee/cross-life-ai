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
visual parity with the locked artwork. The Love Singles variant, full production
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

The browser's file-URL policy disallowed the local file preview; its separate
network could not reach the localhost-only HTTP preview. Neither attempt is
evidence of rendering success. Public upload was stopped by automatic approval
review, so these geometry files are not published or merged.
