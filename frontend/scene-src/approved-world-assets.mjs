import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

export const WORLD_IDS = Object.freeze(['home','work','creativity','wellbeing','relationships','events','style','staarverse','staarsonic']);
export const WORLD_VARIANTS = Object.freeze({
 home:['residence'], work:['command'], creativity:['dream'], wellbeing:['health'],
 relationships:['realm','singles'], events:['village'], style:['closet'],
 staarverse:['universe'], staarsonic:['studio'],
});
const allEntries=WORLD_IDS.flatMap(id=>WORLD_VARIANTS[id].map(variant=>({id,variant,key:id+'-'+variant})));
const sha=value=>typeof value==='string' && /^[a-f0-9]{64}$/.test(value);
const fail=x=>{throw new Error('world_asset_'+x);};
const safeKey=value=>typeof value==='string' && /^[a-z0-9_-]{2,96}$/.test(value);

/** Every approved world needs its own geometry, visual evidence and production permissions.
 * One asset reused nine times can never satisfy the locked 9-world visual designs.
 */
export function validateWorldAsset(bytes,receipt,expected) {
 if(!expected || !allEntries.some(x=>x.key===expected.key)) fail('unknown_world');
 if(!Buffer.isBuffer(bytes)||bytes.length<40||bytes.length>32*1024*1024) fail('invalid_size');
 if(bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length) fail('invalid_glb');
 const len=bytes.readUInt32LE(12);
 if(bytes.toString('ascii',16,20)!=='JSON'||len<=0||len%4!==0||20+len>bytes.length) fail('invalid_glb');
 let gltf;
 try{gltf=JSON.parse(bytes.toString('utf8',20,20+len));}catch{fail('invalid_gltf');}
 if(gltf?.asset?.version!=='2.0'||!Array.isArray(gltf.meshes)||!gltf.meshes.length)fail('empty_geometry');
 if(!Array.isArray(gltf.bufferViews)||!gltf.bufferViews.length||
    !Array.isArray(gltf.accessors)||!gltf.accessors.length||
    !gltf.meshes.some(mesh=>Array.isArray(mesh.primitives)&&mesh.primitives.some(p=>{
      const index=p?.attributes?.POSITION;
      const accessor=Number.isInteger(index)?gltf.accessors[index]:null;
      const view=accessor?gltf.bufferViews[accessor.bufferView]:null;
      if(!accessor||!view||accessor.componentType!==5126||accessor.type!=='VEC3'||
        !Number.isInteger(accessor.count)||accessor.count<3||view.buffer!==0)return false;
      const stride=view.byteStride||12,offset=accessor.byteOffset||0;
      return Number.isInteger(stride)&&stride>=12&&Number.isInteger(offset)&&offset>=0&&
        Number.isInteger(view.byteLength)&&view.byteLength>=offset+(accessor.count-1)*stride+12;
    }))) fail('missing_mesh_vertices');
 if((gltf.buffers||[]).some(x=>x?.uri && !String(x.uri).startsWith('data:'))) fail('remote_asset_reference');
 if((gltf.images||[]).some(x=>x?.uri && !String(x.uri).startsWith('data:'))) fail('remote_asset_reference');
 if(gltf.extensionsRequired?.some(x=>['KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_texture_basisu'].includes(x)))fail('unsupported_decoder');
 const binAt=20+len;
 if(binAt+8>bytes.length||bytes.toString('ascii',binAt+4,binAt+7)!=='BIN'||bytes.readUInt32LE(binAt)<36||binAt+8+bytes.readUInt32LE(binAt)>bytes.length||gltf.bufferViews.some(v=>v.buffer===0&&((v.byteOffset||0)+v.byteLength>bytes.readUInt32LE(binAt))))fail('missing_geometry');
 if(!receipt||receipt.schema!=='staar-world-asset-v1'||receipt.worldId!==expected.id||receipt.variant!==expected.variant)fail('wrong_world_receipt');
 const digest=createHash('sha256').update(bytes).digest('hex');
 if(!sha(receipt.modelSha256)||receipt.modelSha256!==digest)fail('model_hash');
 if(!safeKey(receipt.assetId)||receipt.exportRightsConfirmed!==true||receipt.founderVisualApproved!==true||
 receipt.deviceCaptureVerified!==true||receipt.animationVerified!==true||receipt.navigationVerified!==true||
 !safeKey(receipt.designEvidenceId)||!safeKey(receipt.actualDeviceCaptureId))fail('missing_acceptance');
 return {id:expected.id,variant:expected.variant,assetId:receipt.assetId,modelSha256:digest,glbBase64:bytes.toString('base64')};
}

/** All-or-none release packaging: a partial collection cannot masquerade as 9/9 complete.
 * No files is valid during development; every nonempty production delivery must be complete.
 */
export async function loadApprovedWorldAssets(root) {
 const dir=path.join(root,'assets','worlds'), loaded=[],missing=[];
 for(const entry of allEntries){
  let bytes,receipt;
  try{bytes=await readFile(path.join(dir,entry.key+'.glb'));}catch(e){if(e.code!=='ENOENT')throw e;}
  try{receipt=JSON.parse(await readFile(path.join(dir,entry.key+'.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(!bytes&&!receipt){missing.push(entry.key);continue;}
  if(!bytes||!receipt)fail('partial_pair_'+entry.key);
  loaded.push(validateWorldAsset(bytes,receipt,entry));
 }
 if(!loaded.length)return null;
 if(missing.length)fail('missing_worlds_'+missing.join('_'));
 const totalBytes=loaded.reduce((sum,world)=>sum+Math.ceil(world.glbBase64.length*3/4),0);
 if(totalBytes>48*1024*1024)fail('mobile_memory_budget');
 const fingerprints=new Set(loaded.map(x=>x.modelSha256));
 if(fingerprints.size!==loaded.length)fail('duplicate_world_models');
 return Object.fromEntries(loaded.map(({id,variant,...data})=>[id+'-'+variant,data]));
}
export const REQUIRED_WORLD_ASSETS = allEntries.map(x=>x.key);
