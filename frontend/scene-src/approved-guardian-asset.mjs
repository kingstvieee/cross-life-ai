import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const ARMORED_SOURCE_SHA256 = 'd7f18158a91778a7f3ce97c7326b1c75afefdc792c77ab02c4fead0e3ffa659c';
export const REQUIRED_FACE_TARGETS = ['rest','sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U'];
const RECEIPT_KEYS = ['founderApprovedRig','faceFidelityReviewed','armorFidelityReviewed','frontThreeQuarterProfileReviewed','speechSyncDeviceVerified'];

const isSha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const fail = reason => { throw new Error('guardian_rig_' + reason); };

/** Validate real GLB bytes and an independent founder-signoff receipt.
 * Refuses silently auto-approving a generic AI-generated portrait/model.
 * This checks verifiable asset properties, NOT the truth of review attestations.
 */
export function validateArmoredGuardianGlb(bytes, receipt) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 24 || bytes.length > 18 * 1024 * 1024) fail('invalid_size');
  if (bytes.toString('ascii',0,4) !== 'glTF' || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) fail('invalid_header');
  const jsonLength=bytes.readUInt32LE(12), jsonTag=bytes.toString('ascii',16,20);
  if (jsonTag !== 'JSON' || jsonLength <= 0 || jsonLength > bytes.length-20 || jsonLength%4 !== 0) fail('invalid_json_chunk');
  let gltf;
  try { gltf=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8')); }
  catch { fail('invalid_gltf_json'); }
  if (gltf?.asset?.version !== '2.0' || !Array.isArray(gltf.meshes) || gltf.meshes.length === 0 || !Array.isArray(gltf.skins) || gltf.skins.length === 0) fail('unskinned_model');
  if ([...(gltf.buffers || []), ...(gltf.images || [])].some(v=>typeof v?.uri === 'string' && !v.uri.startsWith('data:'))) fail('external_asset_uri');
  if (Array.isArray(gltf.extensionsRequired) && gltf.extensionsRequired.some(x=>['KHR_draco_mesh_compression','KHR_texture_basisu','EXT_meshopt_compression'].includes(x))) fail('unsupported_compression');
  const names=new Set();
  let hasTargets=false;
  for (const mesh of gltf.meshes) {
    const targets=mesh?.extras?.targetNames;
    if (!Array.isArray(targets) || !targets.every(x=>typeof x==='string')) continue;
    const primitives=mesh.primitives || [];
    if (primitives.some(p=>Array.isArray(p.targets) && p.targets.length===targets.length)) {
      hasTargets=true;
      targets.forEach(n=>names.add(n));
    }
  }
  if (!hasTargets || REQUIRED_FACE_TARGETS.some(v=>!names.has(v))) fail('missing_face_targets');
  if (!receipt || typeof receipt !== 'object' || receipt.schema !== 'staar-armored-guardian-v1') fail('invalid_receipt');
  if (receipt.sourceImageSha256 !== ARMORED_SOURCE_SHA256) fail('wrong_approved_reference');
  const sha=createHash('sha256').update(bytes).digest('hex');
  if (!isSha(receipt.rigModelSha256) || receipt.rigModelSha256 !== sha) fail('model_hash_mismatch');
  if (!RECEIPT_KEYS.every(k=>receipt[k]===true) || typeof receipt.identityAssetId!=='string' || !/^[a-zA-Z0-9_-]{1,96}$/.test(receipt.identityAssetId)) fail('approval_not_verified');
  if (receipt.exportRightsConfirmed !== true) fail('missing_export_rights');
  return { sourceImageSha256:ARMORED_SOURCE_SHA256, rigModelSha256:sha, identityAssetId:receipt.identityAssetId, blendshapeTargets:REQUIRED_FACE_TARGETS, glbBase64:bytes.toString('base64') };
}

/** No asset is a valid state; partial, altered or unapproved files fail the build.
 * The runtime's locked 2D Guardian remains unchanged until a verified asset arrives.
 */
export async function loadApprovedArmoredGuardianAsset(root) {
  const assetDir=path.join(root,'assets');
  let glb, receipt;
  let missing=0;
  try { glb=await readFile(path.join(assetDir,'guardian-armored-rig.glb')); } catch(e) { if(e.code==='ENOENT') missing++; else throw e; }
  try { receipt=JSON.parse(await readFile(path.join(assetDir,'guardian-armor-asset-receipt.json'),'utf8')); } catch(e) { if(e.code==='ENOENT') missing++; else throw e; }
  if (missing===2) return null;
  if(missing) fail('partial_asset_delivery');
  return validateArmoredGuardianGlb(glb,receipt);
}
