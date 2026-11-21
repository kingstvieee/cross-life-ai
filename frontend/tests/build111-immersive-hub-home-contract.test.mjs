import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const home=()=>readFile(new URL('../components/staarwardd/world-hub.tsx',import.meta.url),'utf8');
const scene=()=>readFile(new URL('../components/staarwardd/world-scene.tsx',import.meta.url),'utf8');
const route=()=>readFile(new URL('../app/hub.tsx',import.meta.url),'utf8').catch(()=>readFile(new URL('../app/(tabs)/hub.tsx',import.meta.url),'utf8'));
test('The signed-in homepage contains nine direct portals and a Guardian-only scene', async () => {
 const [src, entry] = await Promise.all([home(), route()]);
 assert.match(entry, /<WorldHub/);
 assert.match(src, /<WorldScene world="hub" embedded guardianPresentation/);
 assert.match(src, /WORLDS\.slice\(0, 5\)\.map\(renderPortal\)/);
 assert.match(src, /WORLDS\.slice\(5, 7\)\.map\(renderPortal\)/);
 assert.match(src, /WORLDS\.slice\(7\)\.map\(renderPortal\)/);
 assert.match(src, /onPress=\{\(\) => openPortal\(world\.id\)\}/);
 assert.match(src, /toronto-skyline-pan\.png/);
 assert.doesNotMatch(src, /ENTER FULL 3D HUB|<GuardianCharacter\b/);
});

test('The presentation runtime cannot use the private QA rig and hides camera controls', async () => {
 const renderer = await readFile(new URL('../scene-src/worlds.js', import.meta.url), 'utf8');
 assert.match(await scene(), /const qaEnabled = !guardianPresentation && Platform\.OS/);
 assert.match(renderer, /const internal=!guardianPresentation && world==='hub'/);
 assert.match(renderer, /document\.querySelector\('header'\)\.hidden/);
 assert.match(renderer, /report\('guardian-arrived'\)/);
});
test('3D hub knows when its WebGL scene actually rendered and keeps the physical iPhone QA HUD separate',async()=>{
 const src=await scene();
 assert.match(src,/embedded = false, onSceneReady/);
 assert.match(src,/qaEnabled && !embedded/);
 assert.match(src,/worldQaEnabled && !embedded/);
 assert.match(src,/sceneReady\.current = true; onSceneReady\?\.\(\)/);
 assert.match(src,/audio\.setGuardianRigHash\(message\.modelSha256\); onGuardianModelReady\?\.\(message\.modelSha256\)/);
 assert.match(src,/onError=\{\(\) => setLoadFailed\(true\)\}/);
 assert.match(src,/onContentProcessDidTerminate=\{\(\) => setLoadFailed\(true\)\}/);
});
test('Voluntary speech remains consent- and user-settings-gated; display correction must not covertly unmute audio',async()=>{
 const src=await home();
 assert.match(src,/!audio\.master \|\| !audio\.voice \|\| audio\.speechQuiet/);
 assert.match(src,/serverGreetingConsent/);
 assert.match(src,/audio\.setSpeechQuiet\(true\)/);
});
