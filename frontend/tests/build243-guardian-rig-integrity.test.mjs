import test from 'node:test';
import assert from 'node:assert/strict';
import {Bone,Group,SkinnedMesh,BoxGeometry,MeshBasicMaterial,Skeleton,DoubleSide,FrontSide} from '../scene-src/node_modules/three/build/three.module.js';
import {inspectGuardianRigIntegrity} from '../scene-src/guardian-rig-integrity.js';
const NAMES=['rest','sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U'];
function fixture(){
 const root=new Group(),neck=new Bone(),head=new Bone();
 neck.name='B230_QA_Joint_Neck';head.name='STAAR_Guardian_Head';
 neck.add(head);root.add(neck);
 const face=new SkinnedMesh(new BoxGeometry(1,1,1),new MeshBasicMaterial({side:DoubleSide}));
 face.name='GuardianContinuousHeadSkinned';
 face.bind(new Skeleton([head]));face.morphTargetDictionary=Object.fromEntries(NAMES.map((n,i)=>[n,i]));
 face.morphTargetInfluences=NAMES.map(()=>0);root.add(face);
 const legacy=new Group();legacy.name='LEGACY_Build225_PrimitiveArmor_HIDDEN';
 legacy.scale.set(0,0,0);
 for(let i=0;i<149;i++){const mesh=new Group();mesh.name='Legacy_'+i;
  // Simulate static mesh class without allocating 149 geometries.
  mesh.isMesh=true;legacy.add(mesh);}
 root.add(legacy);
 return {root,neck,head,face,legacy};
}
test('Build243 body head is attached, 16 facial targets retain two-sided render',()=>{
 const a=fixture(),r=inspectGuardianRigIntegrity(a.root);
 assert.equal(r.valid,true);assert.equal(r.headNeckAttached,true);
 assert.equal(r.protectedFaceDoubleSided,true);assert.equal(r.visemesBound,16);
 assert.equal(r.legacyDetached,false);assert.equal(r.deviceCertified,false);
 assert.equal(a.head.parent,a.neck);
});
test('Build243 safely detaches only all 149 inert legacy meshes',()=>{
 const a=fixture();const before=a.face.material;
 const r=inspectGuardianRigIntegrity(a.root,{detachHiddenLegacy:true});
 assert.equal(r.valid,true);assert.equal(r.legacyDetached,true);
 assert.equal(a.legacy.parent,null);assert.equal(a.face.material,before);
 assert.equal(a.face.material.side,DoubleSide);
 assert.equal(a.head.parent,a.neck);
});
test('Build243 rejects frozen neck, missing head, duplicate identity and invalid face',()=>{
 const broken=fixture();broken.neck.remove(broken.head);broken.root.add(broken.head);
 assert.equal(inspectGuardianRigIntegrity(broken.root).reason,'head_not_parented_to_body_neck');
 const duplicate=fixture();const extra=new Bone();extra.name='STAAR_Guardian_Head';
 duplicate.root.add(extra);
 assert.equal(inspectGuardianRigIntegrity(duplicate.root).valid,false);
 const wrong=fixture();wrong.face.morphTargetDictionary={PP:0};
 assert.equal(inspectGuardianRigIntegrity(wrong.root).reason,'protected_facials_missing');
});
test('Build243 refuses face backface culling, altered legacy group, or skin substitution',()=>{
 const face=fixture();face.face.material.side=FrontSide;
 assert.equal(inspectGuardianRigIntegrity(face.root,{detachHiddenLegacy:true}).reason,'protected_face_material_not_double_sided');
 assert.ok(face.legacy.parent);
 const legacy=fixture();legacy.legacy.scale.set(1,1,1);
 assert.equal(inspectGuardianRigIntegrity(legacy.root,{detachHiddenLegacy:true}).reason,'unexpected_legacy_armor_structure');
 const skin=fixture();skin.face.skeleton.bones=[];
 assert.equal(inspectGuardianRigIntegrity(skin.root).reason,'protected_skinned_face_not_bound_to_head');
});
