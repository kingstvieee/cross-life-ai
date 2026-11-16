import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ARMORED_SOURCE_SHA256, REQUIRED_FACE_TARGETS, validateArmoredGuardianGlb, loadApprovedArmoredGuardianAsset } from '../scene-src/approved-guardian-asset.mjs';

function model(targetNames=REQUIRED_FACE_TARGETS) {
  const gltf={
    asset:{version:'2.0'},
    buffers:[{byteLength:12}],
    bufferViews:[{buffer:0,byteOffset:0,byteLength:12}],
    accessors:[{bufferView:0,componentType:5126,count:1,type:'VEC3'}],
    nodes:[{mesh:0,skin:0}],
    scenes:[{nodes:[0]}],
    meshes:[{extras:{targetNames},primitives:[{attributes:{POSITION:0},targets:targetNames.map(()=>({POSITION:0}))}]}],
    skins:[{joints:[0]}],
  };
  const source=Buffer.from(JSON.stringify(gltf),'utf8'),pad=(4-source.length%4)%4,json=Buffer.concat([source,Buffer.alloc(pad,0x20)]);
  const bin=Buffer.alloc(12);
  const bytes=Buffer.alloc(12+8+json.length+8+bin.length);
  bytes.write('glTF',0);bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.length,8);
  bytes.writeUInt32LE(json.length,12);bytes.write('JSON',16);json.copy(bytes,20);
  const offset=20+json.length;bytes.writeUInt32LE(bin.length,offset);bytes.write('BIN\x00',offset+4,'binary');bin.copy(bytes,offset+8);
  return bytes;
}
function receipt(bytes) {
 return {schema:'staar-armored-guardian-v1',sourceImageSha256:ARMORED_SOURCE_SHA256,
   rigModelSha256:createHash('sha256').update(bytes).digest('hex'),
   identityAssetId:'approved-armored-guardian-v1',exportRightsConfirmed:true,
   founderApprovedRig:true,faceFidelityReviewed:true,armorFidelityReviewed:true,
   frontThreeQuarterProfileReviewed:true,speechSyncDeviceVerified:true};
}
test('verified offline GLB can be packed only after all 16 viseme targets and source/rights agreement',()=>{
 const bytes=model(),result=validateArmoredGuardianGlb(bytes,receipt(bytes));
 assert.equal(result.identityAssetId,'approved-armored-guardian-v1');
 assert.equal(result.sourceImageSha256,ARMORED_SOURCE_SHA256);
 assert.deepEqual(result.blendshapeTargets,REQUIRED_FACE_TARGETS);
 assert.deepEqual(Buffer.from(result.glbBase64,'base64'),bytes);
});
test('wrong face, changed binary, denied approval, tracksuit substitute and absent visemes are rejected',()=>{
 const bytes=model();
 for(const changes of [
   {sourceImageSha256:'b'.repeat(64)}, {rigModelSha256:'c'.repeat(64)},
   {founderApprovedRig:false},{armorFidelityReviewed:false},{faceFidelityReviewed:false},
   {frontThreeQuarterProfileReviewed:false},{speechSyncDeviceVerified:false},
   {exportRightsConfirmed:false},
 ]) assert.throws(()=>validateArmoredGuardianGlb(bytes,{...receipt(bytes),...changes}),/guardian_rig_/);
 assert.throws(()=>validateArmoredGuardianGlb(model(['rest','aa']),receipt(bytes)),/guardian_rig_/);
 assert.throws(()=>validateArmoredGuardianGlb(Buffer.from('garbage'),receipt(bytes)),/guardian_rig_/);
});
test('no model and no receipt leaves the existing Guardian unchanged; partial delivery blocks the build',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'staar-glb-'));
 try{
   assert.equal(await loadApprovedArmoredGuardianAsset(dir),null);
   await mkdir(path.join(dir,'assets'));
   await writeFile(path.join(dir,'assets','guardian-armored-rig.glb'),model());
   await assert.rejects(loadApprovedArmoredGuardianAsset(dir),/guardian_rig_partial_asset_delivery/);
   const bytes=model();
   await writeFile(path.join(dir,'assets','guardian-armor-asset-receipt.json'),JSON.stringify(receipt(bytes)));
   assert.equal((await loadApprovedArmoredGuardianAsset(dir)).identityAssetId,'approved-armored-guardian-v1');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('scene builder and renderer only enable guardian model if verified assets exist',async()=>{
 const {readFile}=await import('node:fs/promises');
 const builder=await readFile(new URL('../scene-src/build.mjs',import.meta.url),'utf8');
 const runtime=await readFile(new URL('../scene-src/worlds.js',import.meta.url),'utf8');
 assert.match(builder,/loadApprovedArmoredGuardianAsset\(root\)/);
 assert.match(builder,/window\.STAAR_APPROVED_GUARDIAN_MODEL=/);
 assert.match(runtime,/asset\?\.glbBase64/);
 assert.match(runtime,/new GLTFLoader\(\)\.parse/);
 assert.match(runtime,/approvedArmoredGuardian\(\)/);
});
