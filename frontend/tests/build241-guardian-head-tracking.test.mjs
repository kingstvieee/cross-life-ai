import test from 'node:test';
import assert from 'node:assert/strict';
import {Bone,Group,SkinnedMesh,BoxGeometry,MeshBasicMaterial,Skeleton,Vector3} from '../scene-src/node_modules/three/build/three.module.js';
import {createGuardianHeadTracking} from '../scene-src/guardian-head-tracking.js';

function fixture(){
 const root=new Group(), head=new Bone();
 head.name='STAAR_Guardian_Head';head.position.set(0,0,2.98);root.add(head);
 const jaw=new Bone();jaw.name='STAAR_Guardian_Jaw';jaw.position.set(0,-.17,-.22);head.add(jaw);
 const mesh=new SkinnedMesh(new BoxGeometry(1,1,1),new MeshBasicMaterial());
 mesh.name='GuardianContinuousHeadSkinned';mesh.bind(new Skeleton([head,jaw]));root.add(mesh);
 root.updateMatrixWorld(true);
 return {root,head,jaw,mesh};
}
function tick(ctrl,n=20){for(let i=0;i<n;i++)ctrl.update(.03);}
test('Guardian focus refuses absent release gate, reduced motion, and unskinned substitute',()=>{
 const f=fixture();
 assert.equal(createGuardianHeadTracking(f.root).ready,false);
 assert.equal(createGuardianHeadTracking(f.root,{approvedAsset:true,reducedMotion:true}).ready,false);
 const generic=new Group();const substitute=new Bone();substitute.name='STAAR_Guardian_Head';generic.add(substitute);
 assert.equal(createGuardianHeadTracking(generic,{approvedAsset:true}).ready,false);
});
test('Head tracks portal positions with bounded turns, then returns to original pose',()=>{
 const {root,head,jaw}=fixture();
 const jawPose=jaw.quaternion.clone(), neutral=head.quaternion.clone();
 const ctrl=createGuardianHeadTracking(root,{approvedAsset:true});
 assert.equal(ctrl.ready,true);
 assert.equal(ctrl.setTargetWorld(new Vector3(5,-4,3.4)),true);
 tick(ctrl);
 let q=head.quaternion.clone();
 assert.ok(q.angleTo(neutral)>0.05);
 assert.ok(ctrl.snapshot().yawRadians<=22*Math.PI/180+1e-6);
 assert.ok(ctrl.snapshot().pitchRadians<=9*Math.PI/180+1e-6);
 assert.ok(jaw.quaternion.equals(jawPose));
 assert.equal(ctrl.setTargetWorld(new Vector3(-5,-4,3.4)),true);
 tick(ctrl);assert.ok(q.angleTo(head.quaternion)>0.10);
 ctrl.clearTarget();tick(ctrl,80);
 assert.ok(head.quaternion.angleTo(neutral)<0.002);
 assert.equal(ctrl.snapshot().faceMorphsDriven,false);
 assert.equal(ctrl.snapshot().physicalIphoneAccepted,false);
 ctrl.dispose();assert.ok(head.quaternion.equals(neutral));
});
test('Head focus fails closed for behind, corrupt, duplicate or near targets',()=>{
 const f=fixture(),ctrl=createGuardianHeadTracking(f.root,{approvedAsset:true});
 assert.equal(ctrl.setTargetWorld(new Vector3(0,3,3)),false);
 assert.equal(ctrl.setTargetWorld(new Vector3(NaN,1,1)),false);
 assert.equal(ctrl.setTargetWorld(new Vector3(0,0,2.98)),false);
 assert.equal(ctrl.setTargetWorld(new Vector3(0,-1,3.2)),true);
 ctrl.update(.03,false);assert.equal(f.head.quaternion.w,1);
 ctrl.dispose();assert.equal(ctrl.setTargetWorld(new Vector3(0,-3,3)),false);
 f.root.add(f.head.clone()); // duplicate must be rejected in a newly instantiated controller
 assert.equal(createGuardianHeadTracking(f.root,{approvedAsset:true}).ready,false);
});
