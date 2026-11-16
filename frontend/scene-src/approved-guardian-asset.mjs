import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import {inspectGuardianMorphGeometry} from './guardian-morph-qa.mjs';

export const ARMORED_SOURCE_SHA256 = 'd7f18158a91778a7f3ce97c7326b1c75afefdc792c77ab02c4fead0e3ffa659c';
export const REAL_FACE_SOURCE_SHA256 = Object.freeze({
  primary: '650434c4b2be625852b195c98e47dc25a551e2949ecd7951cd016c933b4d6886', // IMG_5711.jpeg
  secondary: '35b4ddc162583c034dc1e60c6ab6d0c3db0c391a50f9b6db1be2e567575c68b9', // Foreground white polo in IMG_4824.jpeg
});
// The silver/gold locked PNG is the armour DESIGN reference, NOT a face source.
export const REQUIRED_FACE_TARGETS = ['rest','sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U'];
const RECEIPT_KEYS = ['founderApprovedRig','faceFidelityReviewed','armorFidelityReviewed','frontThreeQuarterProfileReviewed','speechSyncDeviceVerified'];

// Build 202: negative visual QA is binding, even if a positive-looking receipt
// is subsequently paired with the rejected experimental file.
export const REJECTED_BUILD202_GUARDIAN_MODEL_SHA256 = '847c2f412b0184a372cd8a6a9149b78fcfe33a7e3127297196a80611f5e0f50d';
// Build 208 has distinct mouth geometry but the underlying legacy face was never accepted.
// Engineering QA is not facial identity or device-signoff evidence.
export const PRIVATE_BUILD208_QA_ONLY_MODEL_SHA256 = '09dcb3cb56b70f5a2b38e5d5f68de627a62df5ad42ad89e2f9d9123d92cf70b5';
const isSha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const fail = reason => { throw new Error('guardian_rig_' + reason); };
export function assertGuardianModelNotRejected(modelSha256) {
  if (!isSha(modelSha256)) fail('invalid_model_hash');
  if (modelSha256 === REJECTED_BUILD202_GUARDIAN_MODEL_SHA256) fail('build202_visual_rejection');
  if (modelSha256 === PRIVATE_BUILD208_QA_ONLY_MODEL_SHA256) fail('build208_not_final_likeness');
}

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
  const binOffset=20+jsonLength;
  if (bytes.length < binOffset+8 || bytes.toString('ascii',binOffset+4,binOffset+7)!=='BIN') fail('missing_embedded_geometry');
  const binLength=bytes.readUInt32LE(binOffset);
  if(binLength<12 || binOffset+8+binLength>bytes.length || !Array.isArray(gltf.buffers) ||
    !gltf.buffers.length || gltf.buffers[0].byteLength>binLength ||
    !Array.isArray(gltf.bufferViews) || !gltf.bufferViews.length ||
    !Array.isArray(gltf.accessors) || !gltf.accessors.length) fail('missing_embedded_geometry');
  const hasSkinnedFace = (gltf.nodes||[]).some(node=>{
    if (!Number.isInteger(node?.skin) || !Number.isInteger(node?.mesh)) return false;
    const mesh=gltf.meshes[node.mesh];
    const targets=mesh?.extras?.targetNames;
    if (!Array.isArray(targets) || REQUIRED_FACE_TARGETS.some(v=>!targets.includes(v))) return false;
    return Array.isArray(mesh.primitives) && mesh.primitives.some(p=>
      Number.isInteger(p?.attributes?.POSITION) && p.attributes.POSITION<gltf.accessors.length &&
      Array.isArray(p.targets) && p.targets.length===targets.length);
  });
  if(!hasSkinnedFace) fail('missing_skinned_face_targets');
  // An array of 16 names is insufficient: read the embedded GLB vertex deltas.
  const morphQa=inspectGuardianMorphGeometry(gltf,bytes.subarray(binOffset+8,binOffset+8+binLength));
  if (!receipt || typeof receipt !== 'object' || receipt.schema !== 'staar-armored-guardian-v1') fail('invalid_receipt');
  if (receipt.sourceImageSha256 !== ARMORED_SOURCE_SHA256) fail('wrong_approved_reference');
  if (receipt.realFaceSourceSha256?.primary !== REAL_FACE_SOURCE_SHA256.primary ||
      receipt.realFaceSourceSha256?.secondary !== REAL_FACE_SOURCE_SHA256.secondary)
    fail('wrong_real_face_identity_source');

  const sha=createHash('sha256').update(bytes).digest('hex');
  assertGuardianModelNotRejected(sha);
  if (!isSha(receipt.rigModelSha256) || receipt.rigModelSha256 !== sha) fail('model_hash_mismatch');
  if (!RECEIPT_KEYS.every(k=>receipt[k]===true) || typeof receipt.identityAssetId!=='string' || !/^[a-zA-Z0-9_-]{1,96}$/.test(receipt.identityAssetId)) fail('approval_not_verified');
  if (receipt.exportRightsConfirmed !== true) fail('missing_export_rights');
  return { sourceImageSha256:ARMORED_SOURCE_SHA256, realFaceSourceSha256:{...REAL_FACE_SOURCE_SHA256}, rigModelSha256:sha, identityAssetId:receipt.identityAssetId, blendshapeTargets:REQUIRED_FACE_TARGETS, morphQa, glbBase64:bytes.toString('base64') };
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
