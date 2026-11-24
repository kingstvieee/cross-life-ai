import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdtemp,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {
 WORLD_IDS, REQUIRED_WORLD_ASSETS, PRODUCTION_WORLD_IDS,
 REQUIRED_PRODUCTION_WORLD_ASSETS, loadApprovedWorldAssets, loadApprovedProductionWorldAssets,
 validateWorldAsset
} from '../scene-src/approved-world-assets.mjs';

const frontend=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

function glb(index){
 const doc={
  asset:{version:'2.0'},buffers:[{byteLength:36}],
  bufferViews:[{buffer:0,byteLength:36}],
  accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'}],
  meshes:[{primitives:[{attributes:{POSITION:0}}]}],
  nodes:[{mesh:0}],scenes:[{nodes:[0]}],extras:{modelIndex:index}
 };
 const raw=Buffer.from(JSON.stringify(doc));
 const padded=Buffer.concat([raw,Buffer.alloc((4-raw.length%4)%4,32)]);
 const data=Buffer.alloc(12+8+padded.length+8+36);
 data.write('glTF');data.writeUInt32LE(2,4);data.writeUInt32LE(data.length,8);
 data.writeUInt32LE(padded.length,12);data.write('JSON',16);padded.copy(data,20);
 const binary=20+padded.length;data.writeUInt32LE(36,binary);data.write('BIN\0',binary+4,'binary');
 return data;
}
function receipt(bytes,key){
 const dash=key.indexOf('-'),id=key.slice(0,dash),variant=key.slice(dash+1);
 return {schema:'staar-world-asset-v1',worldId:id,variant,
  assetId:id+'-'+variant,modelSha256:createHash('sha256').update(bytes).digest('hex'),
  exportRightsConfirmed:true,founderVisualApproved:true,deviceCaptureVerified:true,
  animationVerified:true,navigationVerified:true,
  designEvidenceId:'test-only-'+id,actualDeviceCaptureId:'test-capture-'+id};
}
test('production needs ten independent destinations and eleven unique GLBs including Singles Lounge',()=>{
 assert.equal(WORLD_IDS.length,9); // Historical review register must not be rewritten.
 assert.equal(REQUIRED_WORLD_ASSETS.length,10);
 assert.equal(PRODUCTION_WORLD_IDS.length,10);
 assert.equal(REQUIRED_PRODUCTION_WORLD_ASSETS.length,11);
 assert.ok(REQUIRED_PRODUCTION_WORLD_ASSETS.includes('diggitstaar-workstation'));
 assert.ok(REQUIRED_PRODUCTION_WORLD_ASSETS.includes('relationships-singles'));
 assert.equal(new Set(REQUIRED_PRODUCTION_WORLD_ASSETS).size,11);
 assert.equal(new Set(PRODUCTION_WORLD_IDS).size,10);
});
test('a valid DIGGITSTAAR workstation needs its own signed model receipt and independent device approval',()=>{
 const key='diggitstaar-workstation',bytes=glb(200);
 const expected={id:'diggitstaar',variant:'workstation',key};
 assert.equal(validateWorldAsset(bytes,receipt(bytes,key),expected).modelSha256,createHash('sha256').update(bytes).digest('hex'));
 for(const patch of [
  {founderVisualApproved:false},{exportRightsConfirmed:false},
  {deviceCaptureVerified:false},{navigationVerified:false},{animationVerified:false}
 ])assert.throws(()=>validateWorldAsset(bytes,{...receipt(bytes,key),...patch},expected),/world_asset_/);
 assert.throws(()=>validateWorldAsset(bytes,receipt(bytes,key),{id:'diggitstaar',variant:'movie',key:'diggitstaar-movie'}),/world_asset_unknown_world/);
});
test('all historical world models cannot pass the new production gate without DIGGITSTAAR GLB',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'staar-production-model-'));
 const dest=path.join(root,'assets','worlds');
 try{
  assert.equal(await loadApprovedProductionWorldAssets(root),null);
  await mkdir(dest,{recursive:true});
  for(const [i,key] of REQUIRED_WORLD_ASSETS.entries()){
   const data=glb(i+1);
   await writeFile(path.join(dest,key+'.glb'),data);
   await writeFile(path.join(dest,key+'.json'),JSON.stringify(receipt(data,key)));
  }
  assert.equal(Object.keys(await loadApprovedWorldAssets(root)).length,10);
  await assert.rejects(loadApprovedProductionWorldAssets(root),/world_asset_missing_worlds_diggitstaar-workstation/);
  const diggit=glb(99);
  await writeFile(path.join(dest,'diggitstaar-workstation.glb'),diggit);
  await assert.rejects(loadApprovedProductionWorldAssets(root),/world_asset_partial_pair_diggitstaar-workstation/);
  await writeFile(path.join(dest,'diggitstaar-workstation.json'),JSON.stringify(receipt(diggit,'diggitstaar-workstation')));
  const all=await loadApprovedProductionWorldAssets(root);
  assert.equal(Object.keys(all).length,11);
  assert.equal(all['diggitstaar-workstation'].modelSha256,createHash('sha256').update(diggit).digest('hex'));
 }finally{await rm(root,{recursive:true,force:true})}
});
test('both signed-release preflight and offline 3D runtime use production-only complete-world loader',async()=>{
 const gate=await readFile(path.join(frontend,'scripts/verify-production-package.mjs'),'utf8');
 const scene=await readFile(path.join(frontend,'scene-src/build.mjs'),'utf8');
 const world=await readFile(path.join(frontend,'scene-src/worlds.js'),'utf8');
 for(const src of [gate,scene])assert.match(src,/loadApprovedProductionWorldAssets/);
 assert.match(gate,/REQUIRED_PRODUCTION_WORLD_ASSETS/);
 assert.match(world,/diggitstaar:'workstation'/);
 assert.doesNotMatch(scene,/const approvedWorlds=await loadApprovedWorldAssets\(/);
});
