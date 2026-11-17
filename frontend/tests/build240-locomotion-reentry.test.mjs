import test from 'node:test';
import assert from 'node:assert/strict';
import {Group, AnimationClip, QuaternionKeyframeTrack, VectorKeyframeTrack}
 from '../scene-src/node_modules/three/build/three.module.js';
import {createGuardianLocomotion} from '../scene-src/guardian-locomotion.js';

const JOINTS=['Pelvis','Spine','Chest','UpperArm_L','UpperArm_R','Forearm_L','Forearm_R',
 'Thigh_L','Thigh_R','Calf_L','Calf_R','Foot_L','Foot_R'];
const CLIPS=['WALK_IN_PLACE_BODY_QA','RUN_IN_PLACE_BODY_QA',
 'BUILD236_WALK_START_BODY_QA','BUILD236_WALK_STOP_BODY_QA',
 'BUILD236_RUN_START_BODY_QA','BUILD236_RUN_STOP_BODY_QA'];
function fixture(){
 const root=new Group();
 for(const joint of JOINTS){const node=new Group();node.name='B230_QA_Joint_'+joint;root.add(node);}
 const tracks=()=>JOINTS.map(joint=>joint==='Pelvis'
   ?new VectorKeyframeTrack('B230_QA_Joint_'+joint+'.position',[0,.4],[0,0,0,0,0,.03])
   :new QuaternionKeyframeTrack('B230_QA_Joint_'+joint+'.quaternion',
     [0,.4],[0,0,0,1,0,.4,0,.916515]));
 const clips=CLIPS.map(name=>new AnimationClip(name,.4,tracks()));
 return {root,clips};
}
const tick=(c,dt,n)=>{for(let i=0;i<n;i++)c.update(dt);};
const quat=root=>root.getObjectByName('B230_QA_Joint_UpperArm_L').quaternion.y;
test('Build240 repeated walk/run/walk does not let an outgoing action stop its own newly active playback',()=>{
 const {root,clips}=fixture();const c=createGuardianLocomotion(root,clips,{approvedAsset:true});
 assert.equal(c.ready,true);
 assert.equal(c.setMode('walk'),true);tick(c,.05,10);
 assert.equal(c.setMode('run'),true);tick(c,.01,1);
 assert.equal(c.setMode('walk'),true);
 tick(c,.03,6);const first=quat(root);
 tick(c,.03,3);const second=quat(root);
 assert.ok(Math.abs(first-second)>.03,{first,second});
 assert.equal(c.snapshot().mode,'walk');
 assert.equal(c.snapshot().phase,'WALK_IN_PLACE_BODY_QA');
 assert.equal(c.snapshot().physicalIphoneMotionCertified,false);
 c.dispose();
});
test('Build240 rapid run/walk/run and idle re-entry keep body actions live',()=>{
 const {root,clips}=fixture();const c=createGuardianLocomotion(root,clips,{approvedAsset:true});
 c.setMode('run');tick(c,.05,10);
 c.setMode('walk');tick(c,.01,1);
 c.setMode('run');tick(c,.03,6);const first=quat(root);tick(c,.03,3);
 assert.ok(Math.abs(first-quat(root))>.03);
 c.setMode('idle');tick(c,.03,2);
 c.setMode('run');tick(c,.03,20);
 assert.equal(c.snapshot().mode,'run');
 assert.equal(c.snapshot().phase,'RUN_IN_PLACE_BODY_QA');
 c.dispose();
});
test('Build240 refuses clips with thirteen duplicates, wrong channels or missing limb tracks',()=>{
 const duplicate=fixture();
 duplicate.clips[0].tracks=Array(13).fill(duplicate.clips[0].tracks[0]);
 assert.equal(createGuardianLocomotion(duplicate.root,duplicate.clips,{approvedAsset:true}).ready,false);
 const wrong=fixture();
 wrong.clips[0].tracks[1]=new VectorKeyframeTrack(
  'B230_QA_Joint_Spine.quaternion',[0,.4],[0,0,0,0,0,.03]);
 assert.equal(createGuardianLocomotion(wrong.root,wrong.clips,{approvedAsset:true}).ready,false);
 const misplaced=fixture();
 misplaced.clips[0].tracks[1]=new QuaternionKeyframeTrack(
  'B230_QA_Joint_Head.quaternion',[0,.4],[0,0,0,1,0,.4,0,.916515]);
 assert.equal(createGuardianLocomotion(misplaced.root,misplaced.clips,{approvedAsset:true}).ready,false);
});
test('Build240 rejects nonfinite, out-of-time, nonunit quaternion and unordered keyframes',()=>{
 const variants=[
  a=>{a.clips[0].tracks[1].values[0]=NaN;},
  a=>{a.clips[0].tracks[1].values[0]=Infinity;},
  a=>{a.clips[0].tracks[1].values[3]=10;},
  a=>{a.clips[0].tracks[1].times[1]=-.1;},
  a=>{a.clips[0].tracks[1].times[1]=.8;},
  a=>{a.clips[0].tracks[1].times[1]=0;},
  a=>{a.clips[0].tracks[0].values[0]=Infinity;},
  a=>{a.clips[0].duration=NaN;},
 ];
 for(const change of variants){const a=fixture();change(a);
  const c=createGuardianLocomotion(a.root,a.clips,{approvedAsset:true});
  assert.equal(c.ready,false);assert.equal(c.setMode('walk'),false);c.dispose();
 }
});
test('Build240 requires all 13 unique skeleton nodes before motion can be enabled',()=>{
 const missing=fixture();
 missing.root.remove(missing.root.getObjectByName('B230_QA_Joint_Foot_L'));
 assert.equal(createGuardianLocomotion(missing.root,missing.clips,{approvedAsset:true}).ready,false);
 const duplicate=fixture();const extra=new Group();extra.name='B230_QA_Joint_Calf_R';duplicate.root.add(extra);
 assert.equal(createGuardianLocomotion(duplicate.root,duplicate.clips,{approvedAsset:true}).ready,false);
 const unrelated=fixture();unrelated.root.children[0].name='Head';
 assert.equal(createGuardianLocomotion(unrelated.root,unrelated.clips,{approvedAsset:true}).ready,false);
});
test('Build240 retains explicit authorization and reduced-motion controls; no device certification',()=>{
 const a=fixture();
 const unauthorized=createGuardianLocomotion(a.root,a.clips);
 assert.equal(unauthorized.ready,false);unauthorized.dispose();
 const reduced=createGuardianLocomotion(a.root,a.clips,{approvedAsset:true,reducedMotion:true});
 assert.equal(reduced.ready,false);reduced.dispose();
 const ready=createGuardianLocomotion(a.root,a.clips,{approvedAsset:true});
 ready.setMode('walk');tick(ready,.05,10);
 const before=quat(a.root);ready.update(.25,false);
 assert.equal(quat(a.root),before);
 const snap=ready.snapshot();
 assert.equal(snap.assetReceiptInspectedByController,false);
 assert.equal(snap.physicalIphoneMotionCertified,false);
 assert.equal(snap.facialTracksDriven,false);
 assert.equal(snap.finalBodyArtApproved,false);
 ready.dispose();
 assert.equal(ready.setMode('walk'),false);
});
