# Local portal geometry production

No paid generation is used. `build_worlds.py` authors geometry using Blender
4.3.2, preserves a camera, and exports hotspot IDs as glTF extras. It produces
eleven GLBs: the nine portal interiors, the central hub and a separate Singles
layout. `geometry-manifest.json` records each file's SHA-256 and review status.

These are **geometry blockouts requiring visual acceptance**, not replicas of
the approved artwork or a finished navigation/collision implementation. The
Guardian's locked image and existing videos are unchanged. There is no Guardian
character mesh, facial rig or lip-sync in these scenes.

Rebuild geometry from the repository root:

```sh
blender --background --factory-startup --python tools/scene-production/build_worlds.py
```

The generated `.blend` files are editable working files. The deterministic
authoring script, GLBs and manifest are committed; preview PNGs and Blender backup
files are excluded. Inspect the Work offline render, compare it with the locked
master, and retain the review status until the composition/materials are accepted.

The offline viewer runtime bundles Three.js 0.187.0 with esbuild 0.28.2. It loads
only the bundled GLB, uses local lighting/environment data, renders on demand,
pauses when hidden and emits allowlisted setup/navigation messages. It performs
no provider calls, microphone recording or external action. `scene-review`
is a separate review route; it does not replace the current Hub or portal screens.

Rebuild runtime with those pinned packages installed in a temporary build folder:

```sh
npm install --prefix /tmp/staar-scene-runtime --ignore-scripts --no-package-lock three@0.187.0 esbuild@0.28.2
cp tools/scene-production/runtime.js /tmp/staar-scene-runtime/runtime.js
/tmp/staar-scene-runtime/node_modules/.bin/esbuild /tmp/staar-scene-runtime/runtime.js --bundle --minify --format=iife --outfile=frontend/assets/3d/scene-runtime.bin
```

The Three.js MIT license is included beside the bundle. No account secrets are
embedded. `frontend/tests/scenes.test.mjs` validates GLB geometry, camera presence,
hashes, size bounds, metadata review state and scene-message routing isolation.

Validation limitations: TypeScript/export and offline geometry checks are distinct
from WebGL/native execution. The cloud browser disallowed a local-file preview;
no attempt was made to bypass that restriction. Native WebView/graphics execution
and final visual fidelity are not certified by these checks.
