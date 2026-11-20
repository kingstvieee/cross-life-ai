import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import { WORLD_IDS, WORLD_VARIANTS, REQUIRED_WORLD_ASSETS, validateWorldAsset,loadApprovedWorldAssets } from '../scene-src/approved-world-assets.mjs';

function makeGlb(tag=1) {
 const data={asset:{version:'2.0'},buffers:[{byteLength:36}],bufferViews:[{buffer:0,byteLength:36}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],nodes:[{mesh:0}],scenes:[{nodes:[0]}]};
 data.extras={uniqueProductionWorld:tag};
 const src=Buffer.from(JSON.stringify(data)),pad=Buffer.alloc((4-src.length%4)%4,32),json=Buffer.concat([src,pad]);
 const out=Buffer.alloc(12+8+json.length+8+36);
 out.write('glTF');out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);
 out.writeUInt32LE(json.length,12);out.write('JSON',16);json.copy(out,20+0);
 const b=20+json.length;out.writeUInt32LE(36,b);out.write('BIN\0',b+4,'binary');
 return out;
}
function receipt(bytes,id,variant) {
 return {schema:'staar-world-asset-v1',worldId:id,variant,assetId:id+'-'+variant+'-approved',
  modelSha256:createHash('sha256').update(bytes).digest('hex'),
  exportRightsConfirmed:true,founderVisualApproved:true,deviceCaptureVerified:true,
  animationVerified:true,navigationVerified:true,designEvidenceId:'founder-proof-'+id,
  actualDeviceCaptureId:'iphone-capture-'+id};
}
test('nine independent locked worlds require ten distinct GLBs including Singles Lounge',()=>{
 assert.equal(WORLD_IDS.length,9);
 assert.equal(REQUIRED_WORLD_ASSETS.length,10);
 assert.deepEqual(WORLD_VARIANTS.relationships,['realm','singles']);
 assert.equal(new Set(REQUIRED_WORLD_ASSETS).size,10);
});
test('wrong world, changed digest, unapproved founder or missing rights cannot become production GLB',()=>{
 const bytes=makeGlb(), expected={id:'home',variant:'residence',key:'home-residence'};
 assert.equal(validateWorldAsset(bytes,receipt(bytes,'home','residence'),expected).assetId,'home-residence-approved');
 for(const patch of [
   {worldId:'work'},{variant:'command'},{modelSha256:'0'.repeat(64)},
   {exportRightsConfirmed:false},{founderVisualApproved:false},
   {deviceCaptureVerified:false},{animationVerified:false},
   {navigationVerified:false},{assetId:'javascript:alert(1)'}
 ])assert.throws(()=>validateWorldAsset(bytes,{...receipt(bytes,'home','residence'),...patch},expected),/world_asset_/);
 assert.throws(()=>validateWorldAsset(Buffer.from('junk'),receipt(bytes,'home','residence'),expected),/world_asset_/);
});
test('no final worlds falls back to preview; incomplete or duplicated deliveries fail closed',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'staar-worlds-'));
 const folder=path.join(root,'assets','worlds');
 try{
  assert.equal(await loadApprovedWorldAssets(root),null);
  await mkdir(folder,{recursive:true});
  const bytes=makeGlb(1);
  await writeFile(path.join(folder,'home-residence.glb'),bytes);
  await assert.rejects(loadApprovedWorldAssets(root),/world_asset_partial_pair/);
  await writeFile(path.join(folder,'home-residence.json'),JSON.stringify(receipt(bytes,'home','residence')));
  await assert.rejects(loadApprovedWorldAssets(root),/world_asset_missing_worlds/);
  for(let i=1;i<REQUIRED_WORLD_ASSETS.length;i++){
   const key=REQUIRED_WORLD_ASSETS[i],split=key.lastIndexOf('-'),id=key.slice(0,split),variant=key.slice(split+1);
   const data=makeGlb(i+1);
   await writeFile(path.join(folder,key+'.glb'),data);
   await writeFile(path.join(folder,key+'.json'),JSON.stringify(receipt(data,id,variant)));
  }
  const all=await loadApprovedWorldAssets(root);
  assert.equal(Object.keys(all).length,10);
  assert.ok(all['relationships-singles'].glbBase64.length>0);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('approved world geometry loads only if accepted and fallback remains',async()=>{
 const builder=await readFile(new URL('../scene-src/build.mjs',import.meta.url),'utf8');
 const renderer=await readFile(new URL('../scene-src/worlds.js',import.meta.url),'utf8');
 assert.match(builder,/loadApprovedWorldAssets\(root\)/);
 assert.match(builder,/STAAR_APPROVED_WORLD_ASSETS=/);
 assert.match(renderer,/window\.STAAR_APPROVED_WORLD_ASSETS/);
 assert.match(renderer,/worldQaEnabled&&window\.STAAR_PRIVATE_WORLDS_QA/); 
 assert.match(renderer,/previewWorldObjects/);
 assert.match(renderer,/addNavigationFallback\(\)/);
});
