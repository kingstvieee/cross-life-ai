import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shouldDispatchSceneAction } from '../src/scene-action-dedup.ts';
test('single intentional portal selection passes; duplicate taps do not',()=>{
 const first={world:'home',action:'connections',atMs:1000};
 assert.equal(shouldDispatchSceneAction(null,first),true);
 assert.equal(shouldDispatchSceneAction(first,{...first,atMs:1100}),false);
 assert.equal(shouldDispatchSceneAction(first,{...first,atMs:1649}),false);
 assert.equal(shouldDispatchSceneAction(first,{...first,atMs:1650}),true);
 assert.equal(shouldDispatchSceneAction(first,{...first,world:'work'}),true);
 assert.equal(shouldDispatchSceneAction(first,{...first,action:'conversation:0'}),true);
 assert.equal(shouldDispatchSceneAction(first,{...first,atMs:NaN}),false);
});
test('native and web 3D hosts both enforce duplicate action suppression',()=>{
 for(const suffix of ['world-scene.tsx','world-scene.web.tsx']){
  const src=readFileSync(new URL('../components/staarwardd/'+suffix,import.meta.url),'utf8');
  assert.match(src,/shouldDispatchSceneAction\(lastDispatch\.current, next\)/);
  assert.match(src,/lastDispatch\.current = next; onAction\(action\)/);
 }
});
