import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('guest portal selection opens a local read-only world, leaving sign-in explicit', () => {
  const hub = read('../components/staarwardd/world-hub.tsx');
  const guest = hub.slice(hub.indexOf('function GuestPortalExplorer'), hub.indexOf('export function WorldHub'));
  assert.match(guest, /<Image source=\{lockedPortalArtwork\[world\.id\]\}/);
  assert.doesNotMatch(guest, /<WorldScene|artworkForSignedInPortal|onAction=/);
  assert.match(hub, /if \(onSignIn\) \{ setInspectedPortal\(target\); return; \}/);
  assert.match(hub, /onThreeDimensionalPortalAction[\s\S]*openPortal\(action\.slice\('world:'\.length\)\)/);
  assert.match(hub, /onPress=\{\(\) => openPortal\(world\.id\)\}/);
  assert.match(hub, /Sign in for tools/);
});

test('public guest renderer neither sends tool events nor receives Guardian/world model data', () => {
  const builder = read('../scene-src/build.mjs');
  const renderer = read('../scene-src/worlds.js');
  assert.match(builder, /readOnly \? publicSceneHtml\(html\) : html/);
  assert.match(builder, /\/\*STAAR_PROTECTED_SCENE_START\*\//);
  assert.match(renderer, /readOnly && type !== 'ready' && type !== 'unavailable'/);
  assert.match(renderer, /if\(world==='hub'\|\|readOnly\)return/);
  for (const platform of ['world-scene.tsx','world-scene.web.tsx']) {
    const host = read('../components/staarwardd/'+platform);
    assert.match(host, /if \(readOnly\) return;[\s\S]*sceneAction\(/);
    assert.match(host, /if\s*\(readOnly\)\s*return;[\s\S]*pushGuardianFrame/);
  }
});

test('a genuine tap on any visible ring card requests entry immediately', () => {
  const renderer=read('../scene-src/worlds.js');
  const tap = renderer.slice(renderer.indexOf('function tap(x, y)'), renderer.indexOf('// Touch: one finger'));
  assert.match(tap, /const target = pick\(x, y\)/);
  assert.match(tap, /if \(target === null\) return;/);
  assert.match(tap, /enter\(target\);/);
  assert.doesNotMatch(tap, /if \(target === st\.focus|else focus\(target\)/);
});

import { portalDestination, sceneAction } from '../src/scene-events.ts';
import { worldIds } from '../scene-src/navigation.js';

test('pending guest sign-in accepts only ten local destinations and only mounts after complete onboarding', () => {
  for (const id of worldIds) {
    assert.equal(portalDestination(id), id);
    assert.equal(sceneAction({source:'staar-scene-v1',world:'hub',type:'select',action:'world:'+id}, 'hub'), 'world:'+id);
  }
  for (const input of ['hub', 'https://example.com', 'guardian-tools', 'Work', 'create:lead', 'work?access=1', 'work/../guardian-tools', {}, undefined]) {
    assert.equal(portalDestination(input), null);
  }
  const boundary = read('../components/staarwardd/access-boundary.tsx');
  assert.match(boundary, /user && !user\.is_demo[\s\S]*user\.onboarding_complete\s*\? <>{children}<ResumeGuestPortal/);
  assert.match(boundary, /if \(!navigation\?\.key\) return;[\s\S]*pending\.current = null;\s*router\.push\(\{ pathname: '\/environment', params: \{ world \}/);
  assert.match(boundary, /const closeSignIn = \(\) => \{\s*pending\.current|const closeSignIn = \(\) => \{\s*pendingGuestPortal\.current = null/);
});
