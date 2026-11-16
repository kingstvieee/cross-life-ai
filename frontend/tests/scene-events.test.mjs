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
  assert.match(native, /onRenderProcessGone=\{\(\) => setLoadFailed\(true\)\}/);
  assert.match(native, /onContentProcessDidTerminate=\{\(\) => setLoadFailed\(true\)\}/);
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

test('native and web previews retry only on explicit user interaction', () => {
  const native = fs.readFileSync(path.join('components', 'staarwardd', 'world-scene.tsx'), 'utf8');
  const web = fs.readFileSync(path.join('components', 'staarwardd', 'world-scene.web.tsx'), 'utf8');
  for (const source of [native, web]) {
    assert.match(source, /Retry 3D preview/);
    assert.match(source, /setRetryCount\(count => count \+ 1\)/);
    assert.doesNotMatch(source, /setInterval\(/);
  }
  assert.match(native, /setLoadFailed\(false\)/);
  assert.match(web, /setFailedScene\(null\)/);
});

test('nine-world connection shortcuts remain explicitly unconnected', () => {
  const providers = fs.readFileSync(path.join('lib', 'staarwardd', 'connections.ts'), 'utf8');
  const screen = fs.readFileSync(path.join('app', 'connections.tsx'), 'utf8');
  const declaredUrls = (providers.match(/url: 'https:\/\//g) || []).length;
  const classified = (providers.match(/kind: 'external-website'/g) || []).length - 1;
  assert.equal(declaredUrls, 30);
  assert.equal(classified, declaredUrls);
  assert.match(screen, /tool.kind === 'external-website'/);
  assert.match(screen, /External websites — not connected/);
  assert.match(screen, /website shortcuts, not STAARWAARDD integrations/);
  assert.match(screen, /world === 'home' && <HomeConnection/);
});
test('nine-world Guardian greeting cannot override voice and master mute settings', () => {
  const guardian = fs.readFileSync(path.join('app', 'guardian-tools.tsx'), 'utf8');
  assert.match(guardian, /proactive-consent/);
  assert.doesNotMatch(guardian, /if\s*\(value\)\s*audio\.update\(\{master:true,voice:true\}\)/);
});

test('connection checklist never overwrites saved data after an unreadable store', () => {
  const screen = fs.readFileSync(path.join('app', 'connections.tsx'), 'utf8');
  assert.match(screen, /setReadFailed\(true\)/);
  assert.match(screen, /Retry loading saved checklist/);
  assert.match(screen, /!loaded \|\| readFailed/);
  assert.match(screen, /setReadFailed\(false\)/);
  assert.match(screen, /accountStorageKey\('staar\.connection-plan\.'/);
  assert.match(screen, /HomeConnection/);
});

test('audio session changes never inherit or continue the prior account playback', () => {
  const audio = fs.readFileSync(path.join('lib', 'staarwardd', 'audio-provider.tsx'), 'utf8');
  assert.match(audio, /accountStorageKey\(ACCOUNT_SETTINGS_BASE, user\.user_id\)/);
  assert.match(audio, /const DEFAULT_SETTINGS: AudioSettings = \{ master: false/);
  assert.match(audio, /activeStorageKey\.current = null/);
  assert.match(audio, /Object\.values\(ambientPlayers\.current\)\.forEach\(player =>/);
  assert.match(audio, /Object\.values\(cuePlayers\.current\)\.forEach\(player =>/);
  assert.match(audio, /setActiveAmbient\(null\)/);
  assert.match(audio, /speechRequest\.current \+= 1/);
  assert.match(audio, /stopServerSpeech\(\);/);
  assert.match(audio, /void Speech\.stop\(\);/);
  assert.doesNotMatch(audio, /AsyncStorage\.getItem\(['"]staarwardd\.v14\.audio-settings['"]\)/);
});

test('ambient and cinematic playback remain locked until the signed-in account settings load', () => {
  const audio = fs.readFileSync(path.join('lib', 'staarwardd', 'audio-provider.tsx'), 'utf8');
  for (const fn of ['playAmbient', 'toggleAmbient', 'playCue']) {
    const start = audio.indexOf('const ' + fn + ' = useCallback(');
    assert.ok(start > 0, fn + ' missing');
    const body = audio.slice(start, start + 250);
    assert.match(body, /!storageKey \|\| activeStorageKey\.current !== storageKey/, fn + ' must require current account');
  }
  assert.match(audio, /const stopAll = useCallback\(\(\) => \{\s*clearFade\(\);/);
  assert.match(audio, /if \(activeAmbient === key\) \{\s*clearFade\(\);/);
});

test('Guardian Life Map never displays a late response for a different portal', () => {
  const tools = fs.readFileSync(path.join('app', 'guardian-tools.tsx'), 'utf8');
  assert.match(tools, /const loadEpoch = useRef\(0\)/);
  assert.match(tools, /const epoch = \+\+loadEpoch\.current/);
  assert.match(tools, /if \(epoch !== loadEpoch\.current\) return/);
  assert.match(tools, /loadEpoch\.current\+\+;setNotes\(\[\]\);setEvents\(\[\]\);setOverview\(null\)/);
  assert.match(tools, /return\(\)=>\{active=false;loadEpoch\.current\+\+;\}/);
});

test('master mute immediately stops cinematic cues and ambient fade', () => {
  const audio = fs.readFileSync(path.join('lib', 'staarwardd', 'audio-provider.tsx'), 'utf8');
  const start = audio.indexOf('const update = useCallback(');
  const end = audio.indexOf('const stopAll = useCallback(', start);
  const update = audio.slice(start, end);
  assert.ok(start > 0 && end > start);
  assert.match(update, /if \(!next\.master \|\| \(!next\.music && !next\.ambience\)\)/);
  assert.match(update, /clearInterval\(fadeTimer\.current\)/);
  assert.match(update, /Object\.values\(cuePlayers\.current\)\.forEach\(player =>/);
  assert.match(update, /lastCue\.current = null/);
  assert.match(update, /pauseAllAmbient\(\)/);
  assert.match(update, /setActiveAmbient\(null\)/);
});

test('native 3D preview responds to renderer unavailability with accessible fallback', () => {
  const native = fs.readFileSync(path.join('components', 'staarwardd', 'world-scene.tsx'), 'utf8');
  const web = fs.readFileSync(path.join('components', 'staarwardd', 'world-scene.web.tsx'), 'utf8');
  assert.match(native, /message\.source === 'staar-scene-v1'/);
  assert.match(native, /message\.type === 'unavailable'/);
  assert.match(native, /message\.world === world/);
  assert.match(native, /setLoadFailed\(true\)/);
  assert.match(native, /sceneFallbackActions\(world\)/);
  assert.match(web, /event\.data\.type === 'unavailable'/);
});

test('native and web 3D viewers recover if renderer readiness never arrives', () => {
  const native = fs.readFileSync(path.join('components', 'staarwardd', 'world-scene.tsx'), 'utf8');
  const web = fs.readFileSync(path.join('components', 'staarwardd', 'world-scene.web.tsx'), 'utf8');
  const renderer = fs.readFileSync(path.join('scene-src', 'worlds.js'), 'utf8');
  assert.match(renderer, /report\('ready',\{geometry:true,objects:scene.children.length\}\)/);
  for (const source of [native, web]) {
    assert.match(source, /sceneReady\.current = false/);
    assert.match(source, /15000/);
    assert.match(source, /clearTimeout\(watchdog\)/);
    assert.match(source, /type === 'ready'/);
    assert.match(source, /sceneReady\.current = true/);
    assert.match(source, /retryCount/);
  }
  assert.match(native, /if \(!sceneReady\.current\) setLoadFailed\(true\)/);
  assert.match(web, /if \(!sceneReady\.current\) setFailedScene\(sceneKey\)/);
  assert.equal(sceneFallbackActions('hub').length, 9);
});

test('3D renderer reports readiness only after the first successful WebGL frame', () => {
  const renderer = fs.readFileSync(path.join('scene-src', 'worlds.js'), 'utf8');
  const draw = renderer.slice(renderer.indexOf('function draw(now)'), renderer.indexOf("controls.addEventListener('change'"));
  assert.match(draw, /firstFrameReady/);
  assert.match(draw, /renderer\.render\(scene,camera\)/);
  assert.match(draw, /if\(!firstFrameReady\)\{firstFrameReady=true;report\('ready'/);
  assert.ok(draw.indexOf('renderer.render(scene,camera)') < draw.indexOf("report('ready'"), 'ready must occur after a successful frame');
  assert.match(draw, /catch\s*\{/);
  assert.match(draw, /addNavigationFallback\(\);report\('unavailable'\)/);
  assert.equal((renderer.match(/report\('ready'/g) || []).length, 1);
  assert.equal((renderer.match(/report\('unavailable'/g) || []).length >= 2, true);
});
