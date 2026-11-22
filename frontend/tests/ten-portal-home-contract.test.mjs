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
 assert.match(hub, /WORLDS\.slice\(5, 10\)/);
 assert.match(hub, /guardian-poses\/guide\.png/);
 assert.match(hub, /WORLDS\.slice\(0, 5\)/);
 assert.match(scenes, /function diggitstaar\(/);
 assert.match(scenes, /diggitstaar\}\)\[world\]/);
});
test('signed TestFlight workflow does not stage the unapproved B250 QA Guardian', async () => {
 const yaml = await read('../../codemagic.yaml');
 assert.doesNotMatch(yaml, /STAAR_INTERNAL_HOME_REVIEW/);
 assert.doesNotMatch(yaml, /stage-private-guardian-b250-qa/);
 assert.match(yaml, /buildNumber='115'/);
 assert.match(yaml, /EXPO_PUBLIC_STAAR_HUB_INTERNAL_ENTRY: '1'/);
 assert.match(yaml, /STAAR_IPHONE_ONLY_QA: '1'/);
 assert.doesNotMatch(yaml, /EXPO_PUBLIC_GUARDIAN_DEVICE_QA/);
 assert.doesNotMatch(yaml, /EXPO_PUBLIC_WORLD_COLLISION_QA/);
});

test('internal iPhone review replaces public entry routes with locked Home while keeping account access gated', async () => {
 const source = await read('../components/staarwardd/access-boundary.tsx');
 assert.ok(source.indexOf('if (user && !user.is_demo)') < source.indexOf('const internalHomeEntry'));
 assert.match(source, /const internalHomeEntry = process\.env\.EXPO_PUBLIC_STAAR_HUB_INTERNAL_ENTRY === '1' &&\s*\(homePath \|\| path === '\/landing' \|\| path === '\/guest'\)/);
 assert.match(source, /Platform\.OS === 'ios' && \(internalHomeEntry \|\| guardianDeviceEntry\)/);
 assert.match(source, /<WorldHub onSignIn=/);
 assert.match(source, /return path === "\/guest" \? <GuestPreview \/> : <SignInScreen \/>/);
});
