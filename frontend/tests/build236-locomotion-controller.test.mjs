import test from 'node:test';
import assert from 'node:assert/strict';
import {Group, AnimationClip, QuaternionKeyframeTrack, VectorKeyframeTrack} from '../scene-src/node_modules/three/build/three.module.js';
import {createGuardianLocomotion} from '../scene-src/guardian-locomotion.js';
import {readFile} from 'node:fs/promises';

const names=['Pelvis','Spine','Chest','UpperArm_L','UpperArm_R','Forearm_L','Forearm_R','Thigh_L','Thigh_R','Calf_L','Calf_R','Foot_L','Foot_R'];
function fixture({injectFace=false}={}){
 const root=new Group();
 for(const name of names){const node=new Group();node.name='B230_QA_Joint_'+name;root.add(node);}
 const trackList=()=>{
  const tracks=names.map(name=> name==='Pelvis'
    ?new VectorKeyframeTrack('B230_QA_Joint_'+name+'.position',[0,.4],[0,0,0,0,0,.03])
    :new QuaternionKeyframeTrack('B230_QA_Joint_'+name+'.quaternion',[0,.4],[0,0,0,1,0,.10,0,.9949874]));
  if(injectFace)tracks[1]=new QuaternionKeyframeTrack('Head.quaternion',[0,.4],[0,0,0,1,0,.1,0,.9949874]);
  return tracks;
 };
 const clips=['WALK_IN_PLACE_BODY_QA','RUN_IN_PLACE_BODY_QA',
  'BUILD236_WALK_START_BODY_QA','BUILD236_WALK_STOP_BODY_QA',
  'BUILD236_RUN_START_BODY_QA','BUILD236_RUN_STOP_BODY_QA'].map(name=>new AnimationClip(name,.4,trackList()));
 return {root,clips};
}
test('Build236 accepted-only locomotion transitions through walking, running and stopping without face tracks',()=>{
 const {root,clips}=fixture();
 assert.equal(createGuardianLocomotion(root,clips).ready,false);
 const controller=createGuardianLocomotion(root,clips,{approvedAsset:true});
 assert.equal(controller.ready,true);
 assert.equal(controller.setMode('walk'),true);
 assert.equal(controller.snapshot().phase,'BUILD236_WALK_START_BODY_QA');
 for(let i=0;i<10;i++)controller.update(.05);
 assert.equal(controller.snapshot().phase,'WALK_IN_PLACE_BODY_QA');
 assert.equal(controller.setMode('run'),true);
 assert.equal(controller.snapshot().phase,'RUN_IN_PLACE_BODY_QA');
 controller.update(.05);
 assert.equal(controller.setMode('idle'),true);
 assert.equal(controller.snapshot().phase,'BUILD236_RUN_STOP_BODY_QA');
 for(let i=0;i<10;i++)controller.update(.05);
 assert.equal(controller.snapshot().mode,'idle');
 assert.equal(controller.snapshot().facialTracksDriven,false);
 assert.equal(controller.snapshot().physicalIphoneMotionCertified,false);
 controller.dispose();controller.dispose();
 assert.equal(controller.setMode('walk'),false);
});
test('Build236 rejects unverified, facial-driving, incomplete and reduced-motion candidates',()=>{
 const {root,clips}=fixture({injectFace:true});
 const invalid=createGuardianLocomotion(root,clips,{approvedAsset:true});
 assert.equal(invalid.ready,false);
 assert.equal(invalid.setMode('run'),false);
 invalid.dispose();
 const base=fixture();
 const reduced=createGuardianLocomotion(base.root,base.clips,{approvedAsset:true,reducedMotion:true});
 assert.equal(reduced.ready,false);
 reduced.dispose();
 const missing=createGuardianLocomotion(base.root,base.clips.slice(0,5),{approvedAsset:true});
 assert.equal(missing.ready,false);missing.dispose();
});
test('Build236 source only activates locomotion after approved GLB import and explicit session-bound QA command',async()=>{
 const src=await readFile(new URL('../scene-src/worlds.js',import.meta.url),'utf8');
 assert.match(src,/guardianLocomotion=createGuardianLocomotion\(guardian,model.animations/);
 assert.match(src,/approvedAsset:true,reducedMotion:reduced/);
 assert.match(src,/staar-guardian-locomotion-qa-command-v1/);
 assert.match(src,/packet.session===session && window.STAAR_GUARDIAN_QA===true/);
 assert.match(src,/physicalIphoneMotionCertified:false/);
});
