import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sceneAction, sceneFallbackActions } from '../src/scene-events.ts';
import { fallbackActions, worldIds } from '../scene-src/navigation.js';
const event = (world, action) => ({ source: 'staar-scene-v1', type: 'select', world, action });
test('renderer requests cannot escape their current-world navigation boundary', () => {
  assert.equal(sceneAction(event('hub', 'world:work'), 'hub'), 'world:work');
  assert.equal(sceneAction(event('home', 'connections'), 'home'), 'connections');
  assert.equal(sceneAction(event('home', 'checkins'), 'home'), 'checkins');
  assert.equal(sceneAction(event('work', 'conversation:1'), 'work'), 'conversation:1');
  for (const value of [null, {}, event('home', 'connections'), event('work', 'world:home'), event('work', 'checkins'), event('work', 'conversation:100'), event('work', 'https://evil.example'), event('work', 'execute:unlock')]) assert.equal(sceneAction(value, 'work'), null);
  assert.equal(sceneAction(event('hub', 'world:unknown'), 'hub'), null);
  assert.equal(sceneAction(event('hub', 'world:hub'), 'hub'), null);
});
test('devices without WebGL retain safe routes to every world and setup', () => {
  const hub = fallbackActions('hub');
  assert.equal(hub.length, 9);
  for (const world of ['hub', ...worldIds]) {
    for (const [, action] of fallbackActions(world)) assert.equal(sceneAction(event(world, action), world), action);
  }
  assert.deepEqual(fallbackActions('unknown'), []);
});

test('all nine worlds have an opt-in 3D preview entry without replacing locked artwork', () => {
  const page = fs.readFileSync(path.join('app', 'world', '[id].tsx'), 'utf8');
  const scene = fs.readFileSync(path.join('app', 'environment.tsx'), 'utf8');
  assert.equal(worldIds.length, 9);
  assert.match(page, /pathname: '\/environment', params: \{ world: id \}/);
  assert.match(page, /Interactive offline geometry/);
  assert.match(scene, /3D DEVELOPMENT PREVIEW/);
  assert.match(scene, /Locked artwork, facial animation/);
  assert.match(page, /source=\{world\.image\}/);
});

test('a lost WebGL context restores accessible portal navigation', () => {
  const renderer = fs.readFileSync(path.join('scene-src', 'worlds.js'), 'utf8');
  assert.match(renderer, /const addNavigationFallback = \(\) =>/);
  assert.match(renderer, /actions\.replaceChildren\(\)/);
  assert.match(renderer, /webglcontextlost/);
  assert.match(renderer, /addNavigationFallback\(\);report\('unavailable'\)/);
  assert.match(renderer, /#reset'\)\.hidden=true/);
  assert.equal(fallbackActions('hub').length, 9);
});

test('native 3D load failures retain nine permission-limited portal routes', () => {
  const native = fs.readFileSync(path.join('components', 'staarwardd', 'world-scene.tsx'), 'utf8');
  assert.match(native, /onError=\{\(\) => setLoadFailed\(true\)\}/);
  assert.match(native, /3D preview unavailable/);
  assert.match(native, /sceneFallbackActions\(world\)/);
  assert.equal(sceneFallbackActions('hub').length, 9);
  for (const world of ['hub', ...worldIds]) {
    assert.deepEqual(sceneFallbackActions(world), fallbackActions(world));
    for (const [, action] of sceneFallbackActions(world)) {
      assert.equal(sceneAction(event(world, action), world), action);
      assert.equal(action.startsWith('execute:'), false);
    }
  }
  assert.deepEqual(sceneFallbackActions('unlisted-world'), []);
});

test('browser iframe failures preserve safe navigation without tool execution', () => {
  const web = fs.readFileSync(path.join('components', 'staarwardd', 'world-scene.web.tsx'), 'utf8');
  assert.match(web, /event\.source !== iframe\.current\?\.contentWindow/);
  assert.match(web, /event\.data\.type === 'unavailable'/);
  assert.match(web, /event\.data\.world === world/);
  assert.match(web, /onError=\{\(\) => setFailedScene\(sceneKey\)\}/);
  assert.match(web, /sceneFallbackActions\(world\)/);
  assert.match(web, /sandbox="allow-scripts"/);
  for (const world of ['hub', ...worldIds]) {
    for (const [, action] of sceneFallbackActions(world)) {
      assert.equal(sceneAction(event(world, action), world), action);
      assert.equal(action.startsWith('execute:'), false);
    }
  }
});
