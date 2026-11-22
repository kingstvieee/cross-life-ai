import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sceneAction, sceneFallbackActions } from '../src/scene-events.ts';
import { worldIds } from '../scene-src/navigation.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const event = (world, action) => ({ source: 'staar-scene-v1', type: 'select', world, action });

test('all ten portal routes expose the opt-in 3D environment without replacing approved artwork', () => {
  const page = read('../app/world/[id].tsx');
  const environment = read('../app/environment.tsx');
  assert.equal(worldIds.length, 10);
  assert.equal(new Set(worldIds).size, 9);
  assert.match(page, /pathname: '\/environment', params: \{ world \}/);
  assert.match(page, /WORLD_BY_ID\[id\] \? id : 'hub'/);
  assert.match(page, /<Redirect href=/);
  assert.match(environment, /3D DEVELOPMENT PREVIEW/);
  assert.match(environment, /Locked artwork, facial animation/);
});

test('offline scene fallback provides ten navigable destinations and rejects execution commands', () => {
  assert.equal(sceneFallbackActions('hub').length, 10);
  for (const id of worldIds) {
    const navigate = 'world:' + id;
    assert.equal(sceneAction(event('hub', navigate), 'hub'), navigate);
    for (const [, action] of sceneFallbackActions(id)) {
      assert.equal(sceneAction(event(id, action), id), action);
      assert.equal(action.startsWith('execute:'), false);
    }
    assert.equal(sceneAction(event(id, 'execute:unlock-door'), id), null);
  }
  assert.equal(sceneAction(event('hub', 'world:unknown'), 'hub'), null);
});

test('renderers wait for a real first frame, fail closed, and permit manual retry', () => {
  const scene = read('../scene-src/worlds.js');
  const native = read('../components/staarwardd/world-scene.tsx');
  const web = read('../components/staarwardd/world-scene.web.tsx');
  const firstFrame = scene.slice(scene.indexOf('function draw(now)'), scene.indexOf("controls.addEventListener('change'"));
  assert.ok(firstFrame.indexOf('renderer.render(scene,camera)') >= 0);
  assert.ok(firstFrame.indexOf('renderer.render(scene,camera)') < firstFrame.indexOf("report('ready'"));
  assert.match(firstFrame, /addNavigationFallback\(\);report\('unavailable'\)/);
  for (const host of [native, web]) {
    assert.match(host, /15000/);
    assert.match(host, /sceneReady\.current = true/);
    assert.match(host, /Retry 3D preview/);
    assert.match(host, /sceneFallbackActions\(world\)/);
  }
});

test('proactive Guardian checks authenticated server consent and never runs in iOS background', () => {
  const hub = read('../components/staarwardd/world-hub.tsx');
  assert.match(hub, /api\('\/api\/guardian\/life-map\/overview'/);
  assert.match(hub, /serverConsentReady/);
  assert.match(hub, /serverPrivate \|\| serverSpeechQuiet/);
  assert.match(hub, /AppState\.addEventListener\('change'/);
  assert.match(hub, /Date\.now\(\) - awaySince < 20 \* 60 \* 1000/);
  assert.match(hub, /if \(!isProactiveWelcomeTime\(new Date\(\)\)\) return/);
  assert.match(hub, /accountStorageKey\('staarwardd\.guardian\.proactive-greeting\.v2'/);
  assert.doesNotMatch(hub, /AsyncStorage\.getItem\('staarwardd\.guardian\.proactive-greeting\.v1'/);
});

test('locked startup remains outside modified 3D and Guardian runtime', () => {
  for (const file of ['../app/environment.tsx', '../components/staarwardd/world-scene.tsx', '../components/staarwardd/world-hub.tsx']) {
    assert.doesNotMatch(read(file), /guardian-startup\.mp4/);
  }
});
