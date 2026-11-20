import {DoubleSide} from 'three';

const REQUIRED_FACE_TARGETS=Object.freeze([
 'rest','sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U'
]);

/** Production guard for the exact receipt-accepted full-body Guardian.
 * This is a renderer integrity check, NOT asset authorization or owner approval.
 * It never edits facial geometry, texture, bones, weights or materials.
 * It may detach only the inert, zero-scale Build225 legacy armour group.
 */
export function inspectGuardianRigIntegrity(root,{detachHiddenLegacy=false}={}){
 const heads=[],necks=[],faces=[],legacy=[];
 root?.traverse?.(node=>{
  if(node.name==='STAAR_Guardian_Head')heads.push(node);
  if(node.name==='B230_QA_Joint_Neck')necks.push(node);
  if(node.name==='GuardianContinuousHeadSkinned')faces.push(node);
  if(node.name==='LEGACY_Build225_PrimitiveArmor_HIDDEN')legacy.push(node);
 });
 const deny=reason=>({valid:false,reason,legacyDetached:false,deviceCertified:false});
 if(heads.length!==1||necks.length!==1||!heads[0].isBone||!necks[0].isBone)
   return deny('missing_or_duplicated_neck_head_bones');
 if(heads[0].parent!==necks[0])
   return deny('head_not_parented_to_body_neck');
 if(faces.length!==1||!faces[0].isSkinnedMesh||!faces[0].skeleton?.bones?.includes(heads[0]))
   return deny('protected_skinned_face_not_bound_to_head');
 const face=faces[0],dict=face.morphTargetDictionary;
 if(!dict||!Array.isArray(face.morphTargetInfluences)||
    !REQUIRED_FACE_TARGETS.every(x=>Number.isInteger(dict[x]) &&
      dict[x]>=0&&dict[x]<face.morphTargetInfluences.length))
   return deny('protected_facials_missing');
 // The protected face has inward-oriented triangles in its 3D study.
 // Do not unilaterally alter it or disable the material's two-sided render.
 const mats=Array.isArray(face.material)?face.material:[face.material];
 if(mats.length===0||mats.some(m=>!m||m.side!==DoubleSide))
   return deny('protected_face_material_not_double_sided');
 if(legacy.length>1)return deny('multiple_legacy_armor_groups');
 let legacyDetached=false;
 if(legacy.length===1){
  const group=legacy[0];
  const hidden=group.scale.x===0&&group.scale.y===0&&group.scale.z===0;
  const safe=group.children.length===149&&group.children.every(
   child=>child.isMesh&&!child.isSkinnedMesh&&child.children.length===0);
  if(!hidden||!safe||!group.parent)return deny('unexpected_legacy_armor_structure');
  // Do not dispose geometry/material here: GLTFLoader may share materials.
  // Detachment hides all 149 historical silver/chrome nodes, without changing
  // the protected model bytes or face/skin pipeline. The review SHA is unchanged.
  if(detachHiddenLegacy){group.parent.remove(group);legacyDetached=true;}
 }
 return {valid:true,reason:null,legacyDetached,deviceCertified:false,
  headNeckAttached:true,protectedFaceDoubleSided:true,visemesBound:16};
}
