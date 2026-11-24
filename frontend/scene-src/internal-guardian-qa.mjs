/**
 * Internal-only Guardian B250 iPhone art/viseme/gait probe.
 * NEVER a production acceptance receipt or alternate production importer.
 * The exact privately staged GLB must be present at build time; no Web fetch.
 */
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

export const B250_PRIVATE_IPHONE_QA_SHA256='057099cac71e04d6e1282b23fb52c9d593b8c1a4e055309254ca1f5609a42134';
export const B250_PRIVATE_IPHONE_QA_BYTES=12646332;
export const B250_PRIVATE_RELATIVE_PATH='assets/private-guardian-qa/guardian-b250-iphone-qa.glb';
export const INTERNAL_QA_SCHEMA='staar-b250-private-internal-iphone-qa-v1';

export function isInternalGuardianQaBuild(env=process.env){
  return (env?.STAAR_INTERNAL_TESTFLIGHT_GUARDIAN==='1' && env?.EAS_BUILD_PROFILE==='production') || env?.EAS_BUILD_PROFILE==='preview' &&
    env?.STAAR_IPHONE_ONLY_QA==='1' &&
    env?.EXPO_PUBLIC_GUARDIAN_DEVICE_QA==='1' &&
    env?.EXPO_PUBLIC_WORLD_COLLISION_QA==='1';
}
const fail=reason=>{throw Error('guardian_internal_qa_'+reason);};
export function inspectInternalGuardianQaBytes(bytes){
  if(!Buffer.isBuffer(bytes)||bytes.length!==B250_PRIVATE_IPHONE_QA_BYTES)fail('incorrect_byte_length');
  if(bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2||
    bytes.readUInt32LE(8)!==bytes.length)fail('invalid_glb_header');
  const jsonLen=bytes.readUInt32LE(12);
  if(jsonLen<80||jsonLen%4||bytes.toString('ascii',16,20)!=='JSON'||
    jsonLen+28>bytes.length)fail('invalid_glb_json');
  let gltf;
  try{gltf=JSON.parse(bytes.toString('utf8',20,20+jsonLen));}
  catch{fail('invalid_gltf_json');}
  if(gltf?.asset?.version!=='2.0'||!Array.isArray(gltf.skins)||gltf.skins.length<1||
    !Array.isArray(gltf.animations)||gltf.animations.length!==11||!Array.isArray(gltf.meshes)||
    !Array.isArray(gltf.nodes))fail('incompatible_rig');
  const head=gltf.nodes.findIndex(n=>n?.name==='STAAR_Guardian_Head');
  const neck=gltf.nodes.findIndex(n=>n?.name==='B230_QA_Joint_Neck');
  const face=gltf.nodes.findIndex(n=>n?.name==='GuardianContinuousHeadSkinned');
  const targets=['rest','sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U'];
  const faceNode=gltf.nodes[face];
  const mesh=gltf.meshes[faceNode?.mesh];
  if(head<0||neck<0||face<0||!gltf.nodes[neck].children?.includes(head)||
    !Number.isInteger(faceNode?.skin)||!mesh?.extras?.targetNames||
    targets.some(t=>!mesh.extras.targetNames.includes(t)))fail('head_neck_face_not_bound');
  if((gltf.buffers??[]).some(x=>x.uri&&!x.uri.startsWith('data:'))||
    (gltf.images??[]).some(x=>x.uri&&!x.uri.startsWith('data:')))fail('external_asset_link');
  const hash=createHash('sha256').update(bytes).digest('hex');
  if(hash!==B250_PRIVATE_IPHONE_QA_SHA256)fail('wrong_binary_hash');
  return Object.freeze({rigModelSha256:hash,byteLength:bytes.length,
    animationCount:gltf.animations.length,faceMorphTargets:targets.length,
    exactSourceHashVerified:true,ownerDeviceApproved:false});
}
export async function loadInternalGuardianQaAsset(root,{env=process.env}={}){
  const candidate=path.join(root,B250_PRIVATE_RELATIVE_PATH);
  if(!isInternalGuardianQaBuild(env)){
    // Do not let an accidentally staged private file migrate into a
    // production/signing or normal web source build.
    if(env?.EAS_BUILD_PROFILE==='production'){
      try{await stat(candidate);fail('private_file_in_production');}
      catch(e){if(e?.code!=='ENOENT')throw e;}
    }
    return null;
  }
  let bytes;
  try{bytes=await readFile(candidate);}
  catch(e){if(e?.code==='ENOENT')fail('exact_private_glb_missing');throw e;}
  const check=inspectInternalGuardianQaBytes(bytes);
  return Object.freeze({
    schema:INTERNAL_QA_SCHEMA,rigModelSha256:check.rigModelSha256,
    glbBase64:bytes.toString('base64'),
    // These are not release evidence. Runtime and app UI must remain
    // marked with internal iPhone QA only, and the owner must inspect it.
    internalQaOnly:true,productionApproved:false,physicalIphoneCertified:false,
    sourceImageSha256:'d7f18158a91778a7f3ce97c7326b1c75afefdc792c77ab02c4fead0e3ffa659c'
  });
}
