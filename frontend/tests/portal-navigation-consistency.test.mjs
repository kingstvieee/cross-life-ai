import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneAction, sceneFallbackActions } from '../src/scene-events.ts';
import { worldIds, worldNames, fallbackActions } from '../scene-src/navigation.js';
import { LOCKED_WORLD_REQUIREMENTS } from '../src/locked-world-acceptance.ts';
const event=(world,action)=>({source:'staar-scene-v1',world,type:'select',action});
test('nine 3D renderer, React host and approved design routes are identical',()=>{
 const approved=Object.keys(LOCKED_WORLD_REQUIREMENTS);
 assert.deepEqual(worldIds,approved);
 assert.equal(worldIds.length,9);
 assert.equal(worldNames.length,9);
 assert.equal(new Set(worldIds).size,9);
 assert.deepEqual(sceneFallbackActions('hub'),fallbackActions('hub'));
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
