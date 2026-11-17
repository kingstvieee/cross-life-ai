import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ARMORED_SOURCE_SHA256, REAL_FACE_SOURCE_SHA256, REQUIRED_FACE_TARGETS, REJECTED_BUILD202_GUARDIAN_MODEL_SHA256, PRIVATE_BUILD208_QA_ONLY_MODEL_SHA256, PRIVATE_BUILD222_UNAPPROVED_ARTIST_MODEL_SHA256, PRIVATE_BUILD225_UNAPPROVED_MULTIVIEW_SHA256, REJECTED_LEGACY_GUARDIAN_MODEL_SHA256, assertGuardianModelNotRejected, validateArmoredGuardianGlb, loadApprovedArmoredGuardianAsset } from '../scene-src/approved-guardian-asset.mjs';

function model(targetNames=REQUIRED_FACE_TARGETS,{duplicateDeltas=false,emptySpeech=false}={}) {
  // Unlike the old one-accessor fixture, this represents 16 separate real
  // embedded VEC3 delta buffers so the production independence gate is tested.
  const vertexCount=16, segmentBytes=vertexCount*12, bin=Buffer.alloc((targetNames.length+1)*segmentBytes);
  for(let i=2;i<targetNames.length;i++){
    if(emptySpeech && i===4)continue;
    const shape=duplicateDeltas?2:i;
    const offset=(i+1)*segmentBytes;
    bin.writeFloatLE(.04,offset+(shape%vertexCount)*12);
    bin.writeFloatLE(.02,offset+((shape+1)%vertexCount)*12+4);
  }
  const gltf={
    asset:{version:'2.0'},
    buffers:[{byteLength:bin.length}],
    bufferViews:[{buffer:0,byteOffset:0,byteLength:bin.length}],
    accessors:Array.from({length:targetNames.length+1},(_,i)=>({
      bufferView:0,byteOffset:i*segmentBytes,componentType:5126,count:vertexCount,type:'VEC3'
    })),
    nodes:[{mesh:0,skin:0}],
    scenes:[{nodes:[0]}],
    meshes:[{extras:{targetNames},primitives:[{
      attributes:{POSITION:0},
      targets:targetNames.map((_,i)=>({POSITION:i+1}))
    }]}],
    skins:[{joints:[0]}],
  };
  const source=Buffer.from(JSON.stringify(gltf),'utf8'),pad=(4-source.length%4)%4;
  const json=Buffer.concat([source,Buffer.alloc(pad,0x20)]);
  const bytes=Buffer.alloc(12+8+json.length+8+bin.length);
  bytes.write('glTF',0);bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.length,8);
  bytes.writeUInt32LE(json.length,12);bytes.write('JSON',16);json.copy(bytes,20);
  const offset=20+json.length;bytes.writeUInt32LE(bin.length,offset);
  bytes.write('BIN',offset+4,'ascii');bytes.writeUInt8(0,offset+7);bin.copy(bytes,offset+8);
  return bytes;
}
function receipt(bytes) {
 return {schema:'staar-armored-guardian-v1',sourceImageSha256:ARMORED_SOURCE_SHA256,
   realFaceSourceSha256:{...REAL_FACE_SOURCE_SHA256},
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
   {sourceImageSha256:'b'.repeat(64)}, {realFaceSourceSha256:null},
   {realFaceSourceSha256:{...REAL_FACE_SOURCE_SHA256,primary:'b'.repeat(64)}},
   {realFaceSourceSha256:{...REAL_FACE_SOURCE_SHA256,secondary:'c'.repeat(64)}},
   {rigModelSha256:'c'.repeat(64)},
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


test('Build 202 visibly rejected 3D model can never be accepted by a forged positive receipt',async()=>{
 const {readFile}=await import('node:fs/promises');
 const register=JSON.parse(await readFile(new URL('../scene-src/build202-cinematic-reference-approval.json',import.meta.url),'utf8'));
 assert.equal(register.scope.cinematicVisualReferenceApproved,true);
 assert.equal(register.scope.approvedTextured3DGuardianGLB,false);
 assert.equal(REJECTED_BUILD202_GUARDIAN_MODEL_SHA256,register.rejectedExperimentalModel.sha256);
 assert.throws(()=>assertGuardianModelNotRejected(register.rejectedExperimentalModel.sha256),/guardian_rig_build202_visual_rejection/);
 assert.doesNotThrow(()=>assertGuardianModelNotRejected('a'.repeat(64)));
 assert.throws(()=>assertGuardianModelNotRejected('invalid'),/guardian_rig_invalid_model_hash/);
 const source=await readFile(new URL('../scene-src/approved-guardian-asset.mjs',import.meta.url),'utf8');
 assert.match(source,/assertGuardianModelNotRejected\(sha\)/);
});

test('14 named speech morphs must have independent real vertex displacements',()=>{
  const valid=model();
  const inspected=validateArmoredGuardianGlb(valid,receipt(valid));
  assert.equal(inspected.morphQa.checkedSpeechTargets,14);
  assert.equal(inspected.morphQa.vertexCount,16);
  assert.ok(inspected.morphQa.maxAbsSpeechMorphCosine<0.9999);
  const copies=model(REQUIRED_FACE_TARGETS,{duplicateDeltas:true});
  assert.throws(()=>validateArmoredGuardianGlb(copies,receipt(copies)),/guardian_morph_indistinguishable_speech_targets/);
  const silent=model(REQUIRED_FACE_TARGETS,{emptySpeech:true});
  assert.throws(()=>validateArmoredGuardianGlb(silent,receipt(silent)),/guardian_morph_silent_speech_target_/);
});


test('Build 208 repaired private viseme source never becomes production face by passing geometry alone',()=>{
 assert.equal(PRIVATE_BUILD208_QA_ONLY_MODEL_SHA256,'09dcb3cb56b70f5a2b38e5d5f68de627a62df5ad42ad89e2f9d9123d92cf70b5');
 assert.throws(()=>assertGuardianModelNotRejected(PRIVATE_BUILD208_QA_ONLY_MODEL_SHA256),/guardian_rig_build208_not_final_likeness/);
});


test('Build 210 keeps actual recovered 198 and distinct-morph 201 legacy face out of private production import',()=>{
 assert.deepEqual(REJECTED_LEGACY_GUARDIAN_MODEL_SHA256,[
  'da1848abf56884827abe3315a7ed2108a4301eb62be9bfd5b6d0e058354e8395',
  'e6e81a37cbc142c4d82fe8aff53adce3fb39b18f364aac18b599dccb4a80b8a1'
 ]);
 for(const sha of REJECTED_LEGACY_GUARDIAN_MODEL_SHA256)
   assert.throws(()=>assertGuardianModelNotRejected(sha),/guardian_rig_legacy_face_not_approved/);
});


test('Build 224 blocks real newly generated Build 222 GLB because actual four-view likeness QA failed',()=>{
 assert.equal(PRIVATE_BUILD222_UNAPPROVED_ARTIST_MODEL_SHA256,'325bc975ccae49db54e5c5ac761a229d7b66930663cb68f5ff5844a507771a36');
 assert.throws(()=>assertGuardianModelNotRejected(PRIVATE_BUILD222_UNAPPROVED_ARTIST_MODEL_SHA256),/guardian_rig_build222_visual_qa_failed/);
});


test('Build 226 blocks actual Build 225 multiview artist review GLB until a new fully accepted model exists',()=>{
 assert.equal(PRIVATE_BUILD225_UNAPPROVED_MULTIVIEW_SHA256,'3332367a0085c1c7a873704564aa7decbde906a17a95960eb7eb39805d59228a');
 assert.throws(()=>assertGuardianModelNotRejected(PRIVATE_BUILD225_UNAPPROVED_MULTIVIEW_SHA256),/guardian_rig_build225_visual_qa_failed/);
});
