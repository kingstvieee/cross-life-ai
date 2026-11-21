import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const home=()=>readFile(new URL('../components/staarwardd/world-hub.tsx',import.meta.url),'utf8');
const scene=()=>readFile(new URL('../components/staarwardd/world-scene.tsx',import.meta.url),'utf8');
const route=()=>readFile(new URL('../app/hub.tsx',import.meta.url),'utf8').catch(()=>readFile(new URL('../app/(tabs)/hub.tsx',import.meta.url),'utf8'));
test('Home stage renders the real offline Three.js Guardian portal chamber, not the stale static Guardian pose image',async()=>{
 const src=await home();
 assert.match(src,/<WorldScene world="hub" embedded onSceneReady=\{onGuardianMotionEnd\} onAction=\{open3dPortal\}/);
 assert.doesNotMatch(src,/<GuardianCharacter\b/);
 assert.doesNotMatch(src,/toronto-skyline-pan\.png/);
 assert.doesNotMatch(src,/<AccessField\b/);
 assert.match(src,/ENTER FULL 3D HUB/);
 assert.match(src,/router\.push\(\{ pathname: '\/environment', params: \{ world: 'hub' \}/);
 assert.match(src,/paddingBottom: 155/);
});
test('3D hub knows when its WebGL scene actually rendered and keeps the physical iPhone QA HUD separate',async()=>{
 const src=await scene();
 assert.match(src,/embedded = false, onSceneReady/);
 assert.match(src,/qaEnabled && !embedded/);
 assert.match(src,/worldQaEnabled && !embedded/);
 assert.match(src,/sceneReady\.current = true; onSceneReady\?\.\(\)/);
 assert.match(src,/onError=\{\(\) => setLoadFailed\(true\)\}/);
 assert.match(src,/onContentProcessDidTerminate=\{\(\) => setLoadFailed\(true\)\}/);
});
test('Voluntary speech remains consent- and user-settings-gated; display correction must not covertly unmute audio',async()=>{
 const src=await home();
 assert.match(src,/!audio\.master \|\| !audio\.voice \|\| audio\.speechQuiet/);
 assert.match(src,/serverGreetingConsent/);
 assert.match(src,/audio\.setSpeechQuiet\(true\)/);
});
