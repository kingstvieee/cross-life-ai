import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Vector3} from 'three';
import {loadPrivateWingedGuardian} from './private-winged-guardian.mjs';
import {mountPrivateSpeakingFace,createPrivateWingPose} from './guardian-winged-fit.js';
import {createApprovedGuardianFaceMotion} from './guardian-face-motion.js';
import {applyGuardianSpeechFrame} from './guardian-speech-bridge.js';

const [bodyPath,facePath,wavPath,alignmentPath]=process.argv.slice(2);
if(!alignmentPath)throw Error('Usage: node check-local-winged-guardian.mjs BODY.glb FACE.glb VOICE.wav ALIGNMENT.json');
const env={STAAR_LOCAL_WINGED_GUARDIAN_QA_GLB:bodyPath,STAAR_LOCAL_GUARDIAN_FACE_QA_GLB:facePath};
assert.equal(await loadPrivateWingedGuardian({}),null);
for(const flags of [{CI:'1'},{EAS_BUILD_PROFILE:'production'},{STAAR_INTERNAL_TESTFLIGHT_GUARDIAN:'1'},{STAAR_PRIVATE_DEVICE_QA_BUILD:'1'}]){
  await assert.rejects(loadPrivateWingedGuardian({...env,...flags}),/only be bundled for local QA/);
}
await assert.rejects(loadPrivateWingedGuardian({...env,STAAR_LOCAL_GUARDIAN_FACE_QA_GLB:bodyPath}),/Unexpected local/);
const asset=await loadPrivateWingedGuardian(env);
globalThis.self=globalThis;
globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
function parse(base64){
  const bytes=Buffer.from(base64,'base64');
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
}
const [{scene:body,animations},{scene:face}]=await Promise.all([parse(asset.glbBase64),parse(asset.faceGlbBase64)]);
const wingPose=createPrivateWingPose(body,animations);
mountPrivateSpeakingFace(body,face);
const faceMesh=face.getObjectByName('GuardianContinuousHeadSkinned');
const head=body.getObjectByName('STAAR_Guardian_Head');
const visible=[];
face.traverse(node=>{if(node.isMesh && node.visible) visible.push(node);});
assert.equal(visible.length,5);
const one=faceMesh.getWorldPosition(new Vector3());
head.rotation.y+=.4;
body.updateMatrixWorld(true);
assert.ok(one.distanceTo(faceMesh.getWorldPosition(new Vector3()))>.01);
const joints=['Root','Mid','Tip'].flatMap(part=>['L','R'].map(side=>body.getObjectByName('STAAR_Wing_'+part+'_'+side)));
wingPose(false,0);
const start=joints.map(j=>j.quaternion.clone());
const move=joints.map(()=>0);
for(const t of [.2,.4,.6,.8,1]){
  wingPose(false,t);
  joints.forEach((j,i)=>{move[i]=Math.max(move[i],j.quaternion.angleTo(start[i]));});
}
assert.ok(move.every(v=>v>.02));
const hoverEnd=joints.map(j=>j.quaternion.clone());
wingPose(true,0);
assert.ok(joints.every((j,i)=>j.quaternion.angleTo(hoverEnd[i])<.001));
wingPose(true,.5);
assert.ok(joints.every((j,i)=>j.quaternion.angleTo(hoverEnd[i])>.02));
const motion=createApprovedGuardianFaceMotion(face,{rigSha256:asset.rigModelSha256,expectedRigSha256:asset.rigModelSha256});
const alignment=JSON.parse(await readFile(alignmentPath,'utf8'));
const audioSha256=createHash('sha256').update(await readFile(wavPath)).digest('hex');
assert.equal(audioSha256,alignment.audioSha256);
const session='guardian-local-winged-fit';
const packet={source:'staar-native-guardian-audio-v1',session,modelSha256:asset.rigModelSha256,
  audioSha256,expectedAudioSha256:alignment.audioSha256,approvedAlignmentEvidenceId:'local_synthetic_qa',
  approvedAlignment:true,playing:true,durationMs:alignment.durationMs,
  cues:alignment.intervals.map(({startMs,viseme})=>({atMs:startMs,viseme,weight:viseme==='rest'?0:.65}))};
const scope={session,modelSha256:asset.rigModelSha256};
for(const step of alignment.intervals){
  const playheadMs=(step.startMs+step.endMs)/2;
  assert.equal(applyGuardianSpeechFrame(motion,{...packet,playheadMs},scope),true);
  if(step.viseme==='rest')assert.ok(visible.every(n=>n.morphTargetInfluences.every(w=>w===0)));
  else assert.ok(visible.every(n=>n.morphTargetInfluences[n.morphTargetDictionary[step.viseme]]===.65));
}
for(const changed of [{playing:false},{audioSha256:'f'.repeat(64)},{modelSha256:'a'.repeat(64)},{session:'stale'}]){
  assert.equal(applyGuardianSpeechFrame(motion,{...packet,playheadMs:300,...changed},scope),false);
  assert.ok(visible.every(n=>n.morphTargetInfluences.every(w=>w===0)));
}
console.log(JSON.stringify({status:'local QA only',rigSha256:asset.rigModelSha256,exactAudioSha256:audioSha256,checkedWingJoints:joints.length,faceMeshes:visible.length,checkedIntervals:alignment.intervals.length}));
