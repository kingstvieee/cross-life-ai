import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Group, Bone, PerspectiveCamera} from '../scene-src/node_modules/three/build/three.module.js';
import {createGuardianPresence3D} from '../scene-src/guardian-presence-3d.js';

const rig=({walk=true,reducedMotion=false}={})=>{
 const model=new Group(),cam=new PerspectiveCamera(55,1,.1,100),states=[],events=[];
 cam.position.set(0,2,9);
 const motion={ready:walk,setMode(m){states.push(m);return true;}};
 return {model,cam,states,events,motion,controller:createGuardianPresence3D(model,{
   camera:cam,locomotion:motion,
   portals:new Map([['work',{x:4,z:-6}],['home',{x:-3,z:-6}]]),
   reducedMotion,onStatus:e=>events.push(e)
 })};
};
test('Guardian is a real Three.js object with perspective-camera awareness, not an image',()=>{
 const {model,cam,controller}=rig();
 cam.position.set(8,2,6);
 for(let n=0;n<50;n++)controller.update(.04);
 assert.ok(model.rotation.y>0.1,'Body should turn toward the camera');
 assert.equal(controller.snapshot().gazeUsesVirtualCameraOnly,true);
 assert.equal(controller.snapshot().physicalIphoneCertified,false);
 controller.dispose();
});
test('approved body-walk controller moves root toward selected 3D portal before opening',()=>{
 const {model,controller,states,events}=rig();
 let entered=0;
 assert.equal(controller.approachPortal('work',()=>entered++),true);
 assert.equal(controller.state,'walking');
 assert.equal(entered,0,'Should not enter instantly');
 for(let i=0;i<500&&entered===0;i++)controller.update(.05);
 assert.equal(entered,1,'Arrive once');
 assert.equal(controller.state,'idle');
 assert.ok(model.position.x>2);
 assert.ok(model.position.z< -3);
 assert.ok(states.includes('walk'));
 assert.equal(states.at(-1),'idle');
 assert.equal(events.at(-1)?.state,'arrived');
 controller.dispose();
});
test('without real rigged walk clips cannot slide static Guardian into the doorway',()=>{
 const {model,controller}=rig({walk:false});
 const origin=model.position.clone();
 assert.equal(controller.ready,false);
 assert.equal(controller.approachPortal('work',()=>{throw Error('Must never be called');}),false);
 for(let i=0;i<60;i++)controller.update(.05);
 assert.ok(model.position.equals(origin),'No animation = no translation');
});
test('unknown, malformed, distant, or interrupted portal actions fail closed',()=>{
 const {model,cam,motion}=rig();
 const controller=createGuardianPresence3D(model,{camera:cam,locomotion:motion,
  portals:{bad:{x:100,z:0},work:{x:4,z:4}}});
 assert.equal(controller.approachPortal('bad',()=>{}),false);
 assert.equal(controller.approachPortal('forged',()=>{}),false);
 assert.equal(controller.approachPortal('work','not-a-callback'),false);
 let opened=0;
 assert.equal(controller.approachPortal('work',()=>opened++),true);
 controller.cancel();
 for(let i=0;i<200;i++)controller.update(.05);
 assert.equal(opened,0);
 controller.dispose();
 assert.equal(controller.approachPortal('work',()=>opened++),false);
 assert.equal(opened,0);
});
test('reduced-motion setting prohibits theatrical walking transitions',()=>{
 const {controller}=rig({reducedMotion:true});
 assert.equal(controller.approachPortal('work',()=>{}),false);
 controller.dispose();
});
test('head-bone gaze requires explicit rig tag and never mutates face geometry',()=>{
 const model=new Group(), head=new Bone(),unknown=new Bone();
 head.userData.staarGazeAxis='localY';head.userData.staarGazeRole='head';model.add(head,unknown);
 const cam=new PerspectiveCamera();cam.position.set(9,2,6);
 const ctl=createGuardianPresence3D(model,{camera:cam});
 for(let i=0;i<20;i++)ctl.update(.05);
 assert.equal(ctl.taggedGazeBones,1);
 assert.ok(Math.abs(head.quaternion.y)>0.001);
 assert.equal(unknown.quaternion.y,0);
 assert.equal(ctl.snapshot().facialMorphTargetsAltered,false);
 ctl.dispose();
 assert.equal(head.quaternion.y,0);
});
test('React Native activates live Guardian only from validated offline asset gate',()=>{
 const generator=readFileSync(new URL('../scene-src/build.mjs',import.meta.url),'utf8');
 const hub=readFileSync(new URL('../components/staarwardd/world-hub.tsx',import.meta.url),'utf8');
 const engine=readFileSync(new URL('../scene-src/worlds.js',import.meta.url),'utf8');
 assert.match(generator,/hasIdentityApprovedGuardian3D/);
 assert.match(hub,/hasIdentityApprovedGuardian3D/);
 assert.match(hub,/<WorldScene world="hub"/);
 assert.match(hub,/GUARDIAN 3D IDENTITY VERIFICATION PENDING/);
 assert.match(engine,/createGuardianPresence3D/);
 assert.match(engine,/guardianPresence\?\.approachPortal/);
 assert.match(engine,/if \(world !== 'hub'\) approvedArmoredGuardian\(\)/);
 assert.match(engine,/asset\.glbBase64/);
 assert.match(engine,/uninterrupted floor/);
 assert.match(engine,/\.04-bounds\.min\.y\*scale/);
 assert.doesNotMatch(engine,/getUserMedia|camera\\.startCapture|navigator\\.mediaDevices/);
});
