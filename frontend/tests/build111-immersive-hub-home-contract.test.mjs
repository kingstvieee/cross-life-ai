import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const home=()=>readFile(new URL('../components/staarwardd/world-hub.tsx',import.meta.url),'utf8');
const scene=()=>readFile(new URL('../components/staarwardd/world-scene.tsx',import.meta.url),'utf8');
const route=()=>readFile(new URL('../app/hub.tsx',import.meta.url),'utf8').catch(()=>readFile(new URL('../app/(tabs)/hub.tsx',import.meta.url),'utf8'));
test('The signed-in homepage is the immersive 3D portal ring around the Guardian stage', async () => {
 const [src, entry, renderer] = await Promise.all([home(), route(), readFile(new URL('../scene-src/worlds.js', import.meta.url), 'utf8')]);
 assert.match(entry, /<WorldHub/);
 // Mount once, after iOS reports Reduce Motion, so the WebView never loads twice.
 assert.match(src, /reduceMotion !== null && <WorldScene world="hub" embedded onAction=/);
 // All ten worlds stay one tap away natively (list sheet + VoiceOver route).
 assert.match(src, /WORLDS\.map\(world =>/);
 assert.match(src, /onPress=\{\(\) => openPortal\(world\.id\)\}/);
 // No flat 5x2 tile grid in front of the 3D scene.
 assert.doesNotMatch(src, /renderPortal|WORLDS\.slice\(0, 5\)|WORLDS\.slice\(5, 10\)/);
 assert.doesNotMatch(src, /ENTER FULL 3D HUB|<GuardianCharacter\b/);
 // Ten portals on a ring; the camera stays inside it; touch picking uses cheap proxies.
 assert.match(renderer, /const immersiveHub = world === 'hub' && !guardianPresentation/);
 assert.match(renderer, /const HUB_RING = [\d.]+, HUB_STEP = Math\.PI \* 2 \/ ids\.length/);
 assert.match(renderer, /ray\.intersectObjects\(pickables, false\)/);
 // Owner direction 24 Nov 2026: no placeholder shapes. Without a model the stage keeps only
 // its pedestal, crown and beam; the backdrop is the locked homepage's cosmic sky.
 assert.doesNotMatch(renderer, /showGuardianPlaceholder|GUARDIAN MODEL PENDING APPROVAL/);
 assert.match(renderer, /if \(immersiveHub && hubLoopReady\) requestDraw\(\);/);
 assert.match(await readFile(new URL('../scene-src/build.mjs', import.meta.url), 'utf8'), /hub-art','cosmic-skyline\.webp'/);
});

test('Private rig presentation is restricted to explicitly staged native review builds', async () => {
 const renderer = await readFile(new URL('../scene-src/worlds.js', import.meta.url), 'utf8');
 assert.match(await scene(), /const qaEnabled = !guardianPresentation && Platform\.OS/);
 const builder = await readFile(new URL('../scene-src/build.mjs', import.meta.url), 'utf8');
 assert.match(builder, /Boolean\(privateGuardianQa\) && process\.env\.STAAR_INTERNAL_HOME_REVIEW\s*===\s*'1'/);
 assert.match(renderer, /window\.STAAR_INTERNAL_HOME_REVIEW === true && Boolean\(window\.ReactNativeWebView\)/);
 // GLB textures (the Guardian's face atlas included) decode through <img>, never fetch(),
 // because the offline page's CSP has no connect-src.
 assert.match(renderer, /parser\.textureLoader = new T\.TextureLoader\(parser\.options\.manager\)/);
 assert.doesNotMatch(renderer, /new GLTFLoader\(\)\.parse\(/);
 assert.match(renderer, /internalQaRoute \|\| internalHomeReview/);
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

test('immersive Home uses a rendered Guardian landing, not a guessed portal intro timeout', async () => {
 const hub = await readFile(new URL('../components/staarwardd/world-hub.tsx', import.meta.url), 'utf8');
 assert.match(hub, /onGuardianArrival=\{onGuardianArrival\}/);
 assert.doesNotMatch(hub, /HUB_INTRO_MS|onSceneReady=\{onSceneReady\}/);
 for (const name of ['world-scene.tsx','world-scene.web.tsx']) {
  const bridge = await readFile(new URL('../components/staarwardd/' + name, import.meta.url), 'utf8');
  assert.match(bridge, /if \(world === 'hub' &&[^\n]*staar-scene-v1[^\n]*\) \{\s*if \([^\n]*guardian-arrived[^\n]*onGuardianArrival/);
 }
});
