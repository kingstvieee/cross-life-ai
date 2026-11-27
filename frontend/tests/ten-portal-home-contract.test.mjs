import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
test('ten distinct portals are ordered and navigable', async () => {
 const [data, directory, navigation, runtime, hub, scenes] = await Promise.all([
  read('../lib/staarwardd/portal-data.ts'), read('../lib/staarwardd/world-directory.ts'),
  read('../scene-src/navigation.js'), read('../scene-src/build.mjs'),
  read('../components/staarwardd/world-hub.tsx'), read('../scene-src/worlds.js')
 ]);
 for (const id of ['home','work','creativity','wellbeing','relationships','events','style','staarverse','staarsonic','diggitstaar']) {
  assert.ok(data.includes(id), `portal data missing ${id}`);
  assert.ok(directory.includes(id), `directory missing ${id}`);
  assert.ok(navigation.includes(`'${id}'`), `navigation missing ${id}`);
  assert.ok(runtime.includes(`'${id}'`), `runtime allowlist missing ${id}`);
 }
 assert.match(navigation, /DIGGITSTAAR/);
 // The ten portals live on the 3D ring (ids.forEach in worlds.js) and in the native list.
 assert.match(hub, /WORLDS\.map\(world =>/);
 assert.doesNotMatch(hub, /guardian-poses\/guide\.png|guardianFallback/);
 assert.match(hub, /<WorldScene world="hub" embedded/);
 assert.match(scenes, /ids\.forEach\(\(id, i\) => \{\n      const alpha = Math\.PI - i \* HUB_STEP/);
 assert.match(scenes, /function diggitstaar\(/);
 assert.match(scenes, /diggitstaar\}\)\[world\]/);
});
test('signed TestFlight workflow stages exact B252 Guardian only for internal review', async () => {
 const yaml = await read('../../codemagic.yaml');
 assert.match(yaml, /STAAR_INTERNAL_HOME_REVIEW: '1'/);
 assert.match(yaml, /STAAR_INTERNAL_TESTFLIGHT_GUARDIAN: '1'/);
 assert.match(yaml, /057099cac71e04d6e1282b23fb52c9d593b8c1a4e055309254ca1f5609a42134/);
 assert.doesNotMatch(yaml, /stage-private-guardian-b250-qa/);
 assert.match(yaml, /staar-home-reconciliation-preflight/);
 assert.match(yaml, /Internal review scope \(physical certification deferred\)/);
 assert.match(yaml, /triggering:\s*\n\s*events: \[\]/);
 assert.match(yaml, /submit_to_testflight: false/);
 assert.doesNotMatch(yaml, /submit_to_testflight: true/);
 assert.match(yaml, /testFlightInternalTestingOnly": true/);
 assert.match(yaml, /STAAR_NEXT_IOS_BUILD/);
 assert.doesNotMatch(yaml, /STAAR_IPHONE_ONLY_QA: '1'/);
 assert.match(yaml, /EXPO_PUBLIC_GUARDIAN_DEVICE_QA: '0'/);
 assert.match(yaml, /EXPO_PUBLIC_WORLD_COLLISION_QA: '0'/);
 assert.match(yaml, /STAAR_REQUIRE_WATCH_APP: '1'/);
 assert.match(yaml, /verify-live-production-backend\.mjs/);
 assert.match(yaml, /verify-build220-ipa\.sh/);
 assert.doesNotMatch(yaml, /EXPO_PUBLIC_BACKEND_URL: https:\/\/cross-life-ai\.emergent\.host/);
});

test('locked Home is the guest entry on every platform and private routes stay gated', async () => {
 const [source, guest, landing, hub] = await Promise.all([
  read('../components/staarwardd/access-boundary.tsx'), read('../app/guest.tsx'),
  read('../app/landing.tsx'), read('../components/staarwardd/world-hub.tsx')
 ]);
 assert.ok(source.indexOf('if (user && !user.is_demo)') < source.indexOf('<WorldHub onSignIn='));
 assert.match(source, /<WorldHub onSignIn=\{\(\) => setShowSignIn\(true\)\} \/>/);
 assert.match(source, /<Modal visible=\{showSignIn\}/);
 assert.match(source, /<SignInScreen onBackToHub=\{\(\) => setShowSignIn\(false\)\}/);
 assert.doesNotMatch(source, /GuestPreview|EXPO_PUBLIC_STAAR_HUB_INTERNAL_ENTRY/);
 assert.match(guest, /export \{ default \} from "\.\/landing"/);
 assert.match(landing, /<Redirect href="\/" \/>/);
 assert.match(hub, /if \(onSignIn\) \{ setInspectedPortal/);
});
