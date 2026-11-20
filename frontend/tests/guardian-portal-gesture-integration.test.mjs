import test from 'node:test';
import assert from 'node:assert/strict';
import {AnimationClip,Group,QuaternionKeyframeTrack,VectorKeyframeTrack,PerspectiveCamera,Bone} from '../scene-src/node_modules/three/build/three.module.js';
import {createGuardianLocomotion} from '../scene-src/guardian-locomotion.js';
import {createGuardianPresence3D} from '../scene-src/guardian-presence-3d.js';

const joints=['Pelvis','Spine','Chest','UpperArm_L','UpperArm_R','Forearm_L','Forearm_R',
 'Thigh_L','Thigh_R','Calf_L','Calf_R','Foot_L','Foot_R'];
const clips=['WALK_IN_PLACE_BODY_QA','RUN_IN_PLACE_BODY_QA',
 'BUILD236_WALK_START_BODY_QA','BUILD236_WALK_STOP_BODY_QA',
 'BUILD236_RUN_START_BODY_QA','BUILD236_RUN_STOP_BODY_QA'];
const q=(joint,duration=.75)=>new QuaternionKeyframeTrack(
 'B230_QA_Joint_'+joint+'.quaternion',[0,duration],[0,0,0,1,0,0,0,1]);
function makeRig({gesture=true}={}){
 const root=new Group();for(const j of joints){let n=new Group();n.name='B230_QA_Joint_'+j;root.add(n);}
 const animations=clips.map(name=>new AnimationClip(name,.75,joints.map(j=>j==='Pelvis'
  ?new VectorKeyframeTrack('B230_QA_Joint_Pelvis.position',[0,.75],[0,0,0,0,0,0])
  :q(j))));
 if(gesture)animations.push(new AnimationClip('STAAR_PORTAL_OPEN_GESTURE_REVIEW',.6,
  ['UpperArm_R','Forearm_R','Chest'].map(j=>q(j,.6))));
 return {root,animations,locomotion:createGuardianLocomotion(root,animations,{approvedAsset:true})};
}
test('portal gesture follows walk and defers the next world until arm motion finishes',()=>{
 const {root,locomotion}=makeRig();const camera=new PerspectiveCamera();camera.position.set(0,2,5);
 let entered=0;const presence=createGuardianPresence3D(root,{
  camera,locomotion,portals:{work:{x:0,z:-3}}});
 assert.equal(locomotion.gestureReady,true);
 assert.equal(presence.approachPortal('work',()=>entered++),true);
 let opening=false;
 for(let i=0;i<450;i++){
  presence.update(.02);locomotion.update(.02);
  if(presence.state==='opening'){opening=true;assert.equal(entered,0);}
  if(entered)break;
 }
 assert.equal(opening,true);
 assert.equal(entered,1);
 assert.equal(presence.state,'idle');
 for(let i=0;i<40;i++){presence.update(.02);locomotion.update(.02);}
 assert.equal(entered,1,'The same door must never open twice');
 presence.dispose();locomotion.dispose();
});
test('cancel mid-portal gesture prevents delayed navigation',()=>{
 const {root,locomotion}=makeRig();const camera=new PerspectiveCamera();camera.position.set(0,2,5);
 let entered=0;const presence=createGuardianPresence3D(root,{
  camera,locomotion,portals:{work:{x:0,z:-2}}});
 assert.equal(presence.approachPortal('work',()=>entered++),true);
 for(let i=0;i<250&&presence.state!=='opening';i++){
  presence.update(.02);locomotion.update(.02);
 }
 assert.equal(presence.state,'opening');
 presence.cancel();
 for(let i=0;i<60;i++){presence.update(.02);locomotion.update(.02);}
 assert.equal(entered,0);
 assert.equal(presence.state,'idle');
 presence.dispose();locomotion.dispose();
});
test('invalid gesture clips fail closed without blocking certified body motion',()=>{
 const {root,locomotion}=makeRig({gesture:false});
 assert.equal(locomotion.ready,true);
 assert.equal(locomotion.gestureReady,false);
 assert.equal(locomotion.openPortal(()=>{throw Error('must not run');}),false);
 assert.equal(locomotion.setMode('walk'),true);
 locomotion.dispose();
});
test('authored Z-up head bone turns naturally with the virtual-camera eye line',()=>{
 const root=new Group(),head=new Bone(),camera=new PerspectiveCamera();
 head.userData={staarGazeAxis:'localZ',staarGazeRole:'head'};
 root.add(head);camera.position.set(9,2,9);
 const presence=createGuardianPresence3D(root,{camera});
 assert.equal(presence.taggedGazeBones,1);
 for(let i=0;i<16;i++)presence.update(.04);
 assert.ok(Math.abs(head.quaternion.z)>.0002,'Head uses its rigger-approved local Z yaw');
 assert.ok(root.rotation.y>.001,'Body follows camera without using device sensors');
 assert.equal(presence.snapshot().physicalIphoneCertified,false);
 presence.dispose();
 assert.ok(Math.abs(head.quaternion.z)<.0001);
});


test('verified chest-scale breathing overlays motion without affecting head or lips',()=>{
 const {root,animations}=makeRig();
 animations.push(new AnimationClip('breathing',3.6,[
  new VectorKeyframeTrack('B230_QA_Joint_Chest.scale',[0,.9,1.8,2.7,3.6],
    [1,1,1,1.012,1.005,1.009,1,1,1,.995,.999,.997,1,1,1])
 ]));
 const control=createGuardianLocomotion(root,animations,{approvedAsset:true});
 assert.equal(control.breathingReady,true);
 assert.equal(control.ready,true);
 assert.equal(control.snapshot().breathingAvailable,true);
 assert.equal(control.setMode('walk'),true);
 for(let i=0;i<70;i++)control.update(.04);
 assert.ok(root.getObjectByName('B230_QA_Joint_Chest').scale.y>0.98);
 control.dispose();
});
