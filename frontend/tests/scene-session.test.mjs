import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('generated scene config binds a per-render session to renderer messages',()=>{
 const builder=read('../scene-src/build.mjs'), runtime=read('../scene-src/worlds.js');
 assert.match(builder,/window\.STAAR_SCENE_SESSION/);
 assert.match(builder,/Invalid scene session/);
 assert.match(runtime,/session = window\.STAAR_SCENE_SESSION/);
 assert.match(runtime,/source: 'staar-scene-v1', world, session, type/);
});
test('both hosts reject old iframe and WebView events after retry',()=>{
 for(const path of ['../components/staarwardd/world-scene.tsx','../components/staarwardd/world-scene.web.tsx']){
   const src=read(path);
   assert.match(src,/worldSceneHtml\(world, variant, session(?:, qaEnabled)?\)/);
   assert.match(src,/\[world, variant, retryCount\]/);
   assert.match(src,/message\.session !== session|event\.data\?\.session !== session/);
 }
});
