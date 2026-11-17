import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createApprovedGuardianFaceMotion,FACE_TARGETS} from '../scene-src/guardian-face-motion.js';

function rig(){
 const influences=Array(16).fill(0);
 const mesh={morphTargetDictionary:Object.fromEntries(FACE_TARGETS.map((name,i)=>[name,i])),
  morphTargetInfluences:influences};
 const root={traverse(fn){fn(mesh);}};
 return {root,influences};
}
const good='a'.repeat(64),bad='b'.repeat(64);
const cues=[{atMs:100,viseme:'PP',weight:.9},{atMs:300,viseme:'FF',weight:.7},{atMs:800,viseme:'rest',weight:0}];

test('Build 217 speech drives exact 16 named morph targets only with verified clip and GLB hashes',()=>{
 const {root,influences}=rig(),m=createApprovedGuardianFaceMotion(root,{rigSha256:good,expectedRigSha256:good});
 assert.equal(m.readyForPlayback,true);
 assert.equal(m.meshCount,1);
 let base={cues,playheadMs:200,durationMs:1000,playing:true,approvedAlignment:true,
  audioSha256:bad,expectedAudioSha256:bad};
 assert.equal(m.update(base),true);
 assert.equal(influences[FACE_TARGETS.indexOf('PP')],.9);
 assert.equal(influences.reduce((a,b)=>a+b,0),.9);
 assert.equal(m.update({...base,playheadMs:400}),true);
 assert.equal(influences[FACE_TARGETS.indexOf('FF')],.7);
 assert.equal(influences[FACE_TARGETS.indexOf('PP')],0);
 for(const mutation of [
  {playing:false},{approvedAlignment:false},{playheadMs:1000},
  {playheadMs:-1},{audioSha256:good},{cues:[{atMs:0,viseme:'NOT_REAL',weight:1}]}
 ]){assert.equal(m.update({...base,...mutation}),false);assert.ok(influences.every(v=>v===0));}
 m.dispose();assert.ok(influences.every(v=>v===0));assert.equal(m.update(base),false);
});

test('Build 217 legacy/mismatched or incomplete 3D face must stay neutral',()=>{
 const {root,influences}=rig();
 const m=createApprovedGuardianFaceMotion(root,{rigSha256:bad,expectedRigSha256:good});
 assert.equal(m.readyForPlayback,false);
 assert.equal(m.update({cues,playheadMs:200,durationMs:1000,
  playing:true,approvedAlignment:true,audioSha256:good,expectedAudioSha256:good}),false);
 assert.ok(influences.every(x=>x===0));
 const incomplete={traverse(fn){fn({morphTargetDictionary:{rest:0},morphTargetInfluences:[0]});}};
 assert.equal(createApprovedGuardianFaceMotion(incomplete,
  {rigSha256:good,expectedRigSha256:good}).readyForPlayback,false);
});

test('Build 217 scene never guesses voice timestamps or bypasses owner rig lock',async()=>{
 const scene=await readFile(new URL('../scene-src/worlds.js',import.meta.url),'utf8');
 const loader=await readFile(new URL('../scene-src/approved-guardian-asset.mjs',import.meta.url),'utf8');
 assert.match(scene,/guardianFaceMotion=createApprovedGuardianFaceMotion/);
 assert.match(scene,/guardianFaceMotion\.mute\(\)/);
 assert.match(scene,/guardianFaceMotion\?\.dispose\(\)/);
 assert.match(loader,/assertGuardianModelNotRejected\(sha\)/);
 assert.doesNotMatch(scene,/Math\.random\(\).*viseme/);
});
