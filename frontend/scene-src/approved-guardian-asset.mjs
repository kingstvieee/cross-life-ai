import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import {inspectGuardianMorphGeometry} from './guardian-morph-qa.mjs';
import {validateLockedGuardianBlackTitaniumFinish} from './locked-guardian-armor-finish.mjs';

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
export const PRIVATE_BUILD222_UNAPPROVED_ARTIST_MODEL_SHA256 = '325bc975ccae49db54e5c5ac761a229d7b66930663cb68f5ff5844a507771a36';
export const PRIVATE_BUILD225_UNAPPROVED_MULTIVIEW_SHA256 = '3332367a0085c1c7a873704564aa7decbde906a17a95960eb7eb39805d59228a';
// Build 227 is a real private corrective GLB, but has no binary-specific likeness/device acceptance.
export const PRIVATE_BUILD227_UNAPPROVED_PROFILE_QA_SHA256 = '8168758c8d8b3c448069315b451147f7d655227f8e1963adfc7fac915e595ab3';
// Build 228 has exact-binary founder VISUAL acceptance. Independent neck/armour, viseme-device and release gates remain incomplete.
export const PRIVATE_BUILD228_OWNER_VISUAL_APPROVED_DEVICE_PENDING_SHA256 = '4d739795c55711a19cd6c4ccb670053697b3ed8e23c2e3648940dac43433540b';
// Build 229 body is static: unapproved armor/material choice and no physical device proof.
export const PRIVATE_BUILD229_STATIC_BODY_REVIEW_SHA256 = '84295da28d4b580f83cad8786cf684ea498c45d5185c85a7d09955b9c6b5f5b4';
// Build 230 is a local programmatic rigging STUDY: joint weights and gait unreviewed.
export const PRIVATE_BUILD230_EXPERIMENTAL_BODY_RIG_SHA256 = '656a12b79a334e6d0a4301b666df5098f0ab6ae1387a5195904b978fc5415130';
// Build 231 locks black titanium + gold, but its heuristic body rig is still PRIVATE QA only.
export const PRIVATE_BUILD231_BLACK_TITANIUM_RIG_REVIEW_SHA256 = '91bac844779ea58cb45804efd4ffe441f68fab6c2dbbae11e8868f7418b04fbc';
// Locked black + gold Build232 refinements are still private and untested on real iPhone.
export const PRIVATE_BUILD232_BLACK_TITANIUM_RIG_QA_SHA256 = 'ecc3c9660cd3bacef39c5ca28193b2c67a4ec5ff433c77347ce58b741bc456f9';
// Separate chrome/gold Build231 private QA; finish conflict is not resolved by engineering check.
export const PRIVATE_BUILD231_CHROME_GOLD_RIG_QA_SHA256 = 'cca5092a8971c7817dab3301b4540c8a9b53844bc1aa0257840bf9db957a077c';
// Build233 adds synthetic planted-foot keys, but not real-device, collision, or final full-body artist acceptance.
export const PRIVATE_BUILD233_CHROME_FOOT_PLANT_QA_SHA256 = '66e6821f4e776ac7a957e8a566de71731a555cdc006714e1e448d58a85fb80dc';
// Build234 offline walk/run has no signed owner body-rig, true iPhone, or Apple evidence.
export const PRIVATE_BUILD234_WALK_RUN_QA_SHA256 = '2ae8eda577a5f60a0c82bb73d04be8280065acba9083b7c4d480e572cb0a58b8';
// Build 236 retains founder-approved face bytes but motion transition QA is not device/artist accepted.
export const PRIVATE_BUILD236_TRANSITION_QA_SHA256 = '283a1d5175c59f07f68373feb81ba417f9ea689de21f41ef0abdeb182fa0cec8';
// Build 210 independent review: neither recovered Build 198 nor revised Build 201
// possesses founder-approved final facial/profile fidelity; separate mouth QA is not release acceptance.
// Review-only 241–244 private binaries must never pass with forged positive receipts.
export const PRIVATE_BUILD241_REVIEW_ONLY_SHA256 = '667f68dc172cd8dde66b25227604929582d2b86e39e50c1eb87a368e94bd59da';
export const PRIVATE_BUILD242_REVIEW_ONLY_SHA256 = '8c2ed15001070453e232809492de8916d2e46313d835d21556e6a8fc80dcb768';
export const PRIVATE_BUILD243_REVIEW_ONLY_SHA256 = '804f4e0f714bcbde63572d8ac83cb11a9a6c2e6ee888117b749a591df163ae78';
export const PRIVATE_BUILD244_REVIEW_ONLY_SHA256 = 'afdf2b3deccc96786faf7cc8357f2d9abed9dd20796bec7b6bd848ff8cc5cfcc';
export const PRIVATE_BUILD247_CHROME_MATCH_REVIEW_ONLY_SHA256 = '41ee34c1fb2baf82082a7f8aa6426242be0a69df636617858c467f87fb8897a4';
export const PRIVATE_BUILD247_TITANIUM_MATCH_REVIEW_ONLY_SHA256 = '22d91cf0f516d95d1f98f1c69826ec8f3219d14daafd8e9e62c9c0b7305d5755';
// Exact Build248 duplicate-ear fixes remain private, not final identity acceptance.
export const PRIVATE_BUILD248_CHROME_EAR_CLEANUP_REVIEW_ONLY_SHA256 = '2a3ef97275db797daa4247297770b3c062051fcc6461adb39c4faa99a8205c8d';
export const PRIVATE_BUILD248_TITANIUM_EAR_CLEANUP_REVIEW_ONLY_SHA256 = '3b3ccefe72bd5f9dc3828fc09f8f080c06d7f9f356e771e108e57e6db9d8d525';
// Build249 is a texture/proportion/collar experiment; no exact-model owner/device proof.
export const PRIVATE_BUILD249_FACE_COLLAR_REVIEW_SHA256 = 'f2465c2a670af1e22d884689253bffc6ade39094313d11be7269f00e26774114';
// Build250 material/neck repair remains private pending owner/device sign-off.
export const PRIVATE_BUILD250_CHROME_NECK_REVIEW_SHA256 = '057099cac71e04d6e1282b23fb52c9d593b8c1a4e055309254ca1f5609a42134';
export const REJECTED_LEGACY_GUARDIAN_MODEL_SHA256 = Object.freeze([
  'da1848abf56884827abe3315a7ed2108a4301eb62be9bfd5b6d0e058354e8395',
  'e6e81a37cbc142c4d82fe8aff53adce3fb39b18f364aac18b599dccb4a80b8a1',
]);
const isSha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const fail = reason => { throw new Error('guardian_rig_' + reason); };
export function assertGuardianModelNotRejected(modelSha256) {
  if (!isSha(modelSha256)) fail('invalid_model_hash');
  if (modelSha256 === REJECTED_BUILD202_GUARDIAN_MODEL_SHA256) fail('build202_visual_rejection');
  if (modelSha256 === PRIVATE_BUILD208_QA_ONLY_MODEL_SHA256) fail('build208_not_final_likeness');
  if (modelSha256 === PRIVATE_BUILD222_UNAPPROVED_ARTIST_MODEL_SHA256) fail('build222_visual_qa_failed');
  if (modelSha256 === PRIVATE_BUILD225_UNAPPROVED_MULTIVIEW_SHA256) fail('build225_visual_qa_failed');
  if (modelSha256 === PRIVATE_BUILD227_UNAPPROVED_PROFILE_QA_SHA256) fail('build227_not_owner_accepted');
  if (modelSha256 === PRIVATE_BUILD228_OWNER_VISUAL_APPROVED_DEVICE_PENDING_SHA256) fail('build228_release_requirements_pending');
  if (modelSha256 === PRIVATE_BUILD229_STATIC_BODY_REVIEW_SHA256) fail('build229_unrigged_body_not_approved');
  if (modelSha256 === PRIVATE_BUILD230_EXPERIMENTAL_BODY_RIG_SHA256) fail('build230_experimental_rig_not_approved');
  if (modelSha256 === PRIVATE_BUILD231_BLACK_TITANIUM_RIG_REVIEW_SHA256) fail('build231_artist_and_device_not_certified');
  if (modelSha256 === PRIVATE_BUILD232_BLACK_TITANIUM_RIG_QA_SHA256) fail('build232_private_rig_not_device_certified');
  if (modelSha256 === PRIVATE_BUILD231_CHROME_GOLD_RIG_QA_SHA256) fail('build231_chrome_gold_private_rig_not_approved');
  if (modelSha256 === PRIVATE_BUILD233_CHROME_FOOT_PLANT_QA_SHA256) fail('build233_private_foot_qa_not_device_approved');
  if (modelSha256 === PRIVATE_BUILD234_WALK_RUN_QA_SHA256) fail('build234_private_walk_run_not_device_approved');
  if (modelSha256 === PRIVATE_BUILD236_TRANSITION_QA_SHA256) fail('build236_motion_not_owner_device_approved');
  if (modelSha256 === PRIVATE_BUILD241_REVIEW_ONLY_SHA256) fail('build241_private_qa_unapproved');
  if (modelSha256 === PRIVATE_BUILD242_REVIEW_ONLY_SHA256) fail('build242_private_qa_unapproved');
  if (modelSha256 === PRIVATE_BUILD243_REVIEW_ONLY_SHA256) fail('build243_private_qa_unapproved');
  if (modelSha256 === PRIVATE_BUILD244_REVIEW_ONLY_SHA256) fail('build244_private_qa_unapproved');
  if (modelSha256 === PRIVATE_BUILD247_CHROME_MATCH_REVIEW_ONLY_SHA256) fail('build247_chrome_visual_match_not_owner_accepted');
  if (modelSha256 === PRIVATE_BUILD247_TITANIUM_MATCH_REVIEW_ONLY_SHA256) fail('build247_titanium_visual_match_not_owner_accepted');
  if (modelSha256 === PRIVATE_BUILD248_CHROME_EAR_CLEANUP_REVIEW_ONLY_SHA256) fail('build248_chrome_not_final_artist_or_device_approved');
  if (modelSha256 === PRIVATE_BUILD248_TITANIUM_EAR_CLEANUP_REVIEW_ONLY_SHA256) fail('build248_titanium_not_final_artist_or_device_approved');
  if (modelSha256 === PRIVATE_BUILD249_FACE_COLLAR_REVIEW_SHA256) fail('build249_private_likeness_and_device_not_approved');
  if (modelSha256 === PRIVATE_BUILD250_CHROME_NECK_REVIEW_SHA256) fail('build250_private_art_device_not_approved');
  if (REJECTED_LEGACY_GUARDIAN_MODEL_SHA256.includes(modelSha256)) fail('legacy_face_not_approved');
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
  const armorFinish=validateLockedGuardianBlackTitaniumFinish(gltf);
  if (!isSha(receipt.rigModelSha256) || receipt.rigModelSha256 !== sha) fail('model_hash_mismatch');
  if (!RECEIPT_KEYS.every(k=>receipt[k]===true) || typeof receipt.identityAssetId!=='string' || !/^[a-zA-Z0-9_-]{1,96}$/.test(receipt.identityAssetId)) fail('approval_not_verified');
  if (receipt.exportRightsConfirmed !== true) fail('missing_export_rights');
  return { sourceImageSha256:ARMORED_SOURCE_SHA256, realFaceSourceSha256:{...REAL_FACE_SOURCE_SHA256}, rigModelSha256:sha, identityAssetId:receipt.identityAssetId, blendshapeTargets:REQUIRED_FACE_TARGETS, morphQa, armorFinish, glbBase64:bytes.toString('base64') };
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
