import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneAction, sceneFallbackActions } from '../src/scene-events.ts';
import { worldIds, worldNames, fallbackActions } from '../scene-src/navigation.js';
import { LOCKED_WORLD_REQUIREMENTS } from '../src/locked-world-acceptance.ts';
const event=(world,action)=>({source:'staar-scene-v1',world,type:'select',action});
test('nine locked primary worlds and separately gated DIGGITSTAAR studio have identical 3D and native routes',()=>{
 const approved=Object.keys(LOCKED_WORLD_REQUIREMENTS);
 assert.deepEqual(worldIds.filter(id => id !== 'diggitstaar'),approved);
 assert.equal(approved.length,9);
 assert.equal(worldIds.length,10);
 assert.equal(worldNames.length,10);
 assert.equal(worldIds.at(-1),'diggitstaar');
 assert.equal(worldNames.at(-1),'DIGGITSTAAR');
 assert.equal(new Set(worldIds).size,10);
 assert.deepEqual(sceneFallbackActions('hub'),fallbackActions('hub'));
 assert.deepEqual(sceneFallbackActions('diggitstaar'), [
   ['Open production workstation', 'diggitstaar:studio'],
   ['Visit DIGGITSTAAR.com', 'diggitstaar:website']
 ]);
 for(const id of worldIds) {
   assert.deepEqual(sceneFallbackActions(id),fallbackActions(id),id);
   assert.equal(sceneAction(event('hub','world:'+id),'hub'),'world:'+id);
 }
});
test('cross-world and forged 3D messages never execute a native/provider command',()=>{
 for(const id of worldIds){
   for(const candidate of ['execute:unlock','fetch:calendar','home:open-door','world:home','delete:files']){
     assert.equal(sceneAction(event(id,candidate),id),null,id+':'+candidate);
   }
   assert.equal(sceneAction(event(id,'connections'),'hub'),null);
   assert.equal(sceneAction({...event(id,'connections'),source:'foreign-renderer'},id),null);
   assert.equal(sceneAction({...event(id,'connections'),world:'home'},id),id==='home'?'connections':null);
 }
 assert.deepEqual(sceneFallbackActions('unknown'),[]);
});
