import test from 'node:test';
import assert from 'node:assert/strict';
import {Bone,BoxGeometry,BufferAttribute,Mesh,MeshBasicMaterial,SkinnedMesh,Skeleton,Group} from '../scene-src/node_modules/three/build/three.module.js';
import {createGuardianNeckPoseProbe} from '../scene-src/guardian-neck-pose-probe.js';

function fixture({withGasket=true}={}){
 const root=new Group(),neck=new Bone(),head=new Bone();
 neck.name='B230_QA_Joint_Neck';head.name='STAAR_Guardian_Head';
 neck.add(head);root.add(neck);
 const geo=new BoxGeometry(.18,.3,.18);
 // Use a real skinned mesh with valid 4-weight bone attributes.
 const n=geo.attributes.position.count;
 const indices=new Uint16Array(n*4),weights=new Float32Array(n*4);
 for(let i=0;i<n;i++)weights[i*4]=1;
 geo.setAttribute('skinIndex',new BufferAttribute(indices,4));
 geo.setAttribute('skinWeight',new BufferAttribute(weights,4));
 const face=new SkinnedMesh(geo,new MeshBasicMaterial());
 face.name='GuardianContinuousHeadSkinned';root.add(face);face.bind(new Skeleton([head]));
 const gasket=new Mesh(new BoxGeometry(.2,.08,.2),new MeshBasicMaterial());
 gasket.name='B244_NeckToCollar_BlackGasket_REVIEW_ONLY';
 gasket.position.y=-.18;if(withGasket)neck.add(gasket);
 return {root,neck,head,face,gasket};
}
test('Three.js posture probe refuses absent model approval or wrong skeletal ancestry',()=>{
 const a=fixture();
 assert.equal(createGuardianNeckPoseProbe(a.root).ready,false);
 const q=createGuardianNeckPoseProbe(a.root,{approvedAsset:true});
 assert.equal(q.ready,true);assert.equal(q.hasGasket,true);
 const b=fixture();b.neck.remove(b.head);b.root.add(b.head);
 assert.equal(createGuardianNeckPoseProbe(b.root,{approvedAsset:true}).ready,false);
 q.dispose();
});
test('QA reads actual skinned mesh and collar bounds, limits sample rate, never certifies device',()=>{
 const f=fixture();const qa=createGuardianNeckPoseProbe(f.root,{approvedAsset:true});
 assert.equal(qa.sample(0),true);
 assert.equal(qa.sample(100),false);
 assert.equal(qa.sample(260),true);
 const x=qa.snapshot();
 assert.equal(x.neckPoseSamples,2);assert.equal(x.neckPoseFailures,0);
 assert.equal(x.neckQaDecision,'UNVERIFIED');
 assert.equal(x.physicalIphoneCertified,false);
 assert.equal(x.collarVisualApproved,false);
 assert.ok(Number.isFinite(x.neckMaxPositiveGapUnits));
 f.head.position.set(.1,0,0);assert.equal(qa.sample(520),true);
 assert.ok(qa.snapshot().neckMaxHeadTranslationDriftUnits>.09);
 qa.dispose();assert.equal(qa.sample(800),false);
});
test('QA never fakes a measurement without the actual collar geometry',()=>{
 const a=fixture({withGasket:false});
 const qa=createGuardianNeckPoseProbe(a.root,{approvedAsset:true});
 assert.equal(qa.ready,true);assert.equal(qa.hasGasket,false);
 assert.equal(qa.sample(300),false);
 assert.equal(qa.snapshot().neckPoseSamples,0);
});
