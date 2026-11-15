import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sceneAction } from '../src/scene-events.ts';
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
