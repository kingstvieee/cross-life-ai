/**
 * STAARWAARDD Build 232: founder-selected black titanium + gold armour finish.
 * This checks GLB material data, not merely claimed metadata.
 * Release still requires separate final rig/rights/iPhone/Apple evidence.
 */
export const LOCKED_GUARDIAN_FULLBODY_FINISH = Object.freeze({
  schema: 'staar-guardian-fullbody-finish-v1',
  founderSelected: 'black-titanium-and-gold',
  build229SourceSha256: '84295da28d4b580f83cad8786cf684ea498c45d5185c85a7d09955b9c6b5f5b4',
  approvedBuild228FaceSha256: '4d739795c55711a19cd6c4ccb670053697b3ed8e23c2e3648940dac43433540b',
  materialVariantName: 'LOCKED black titanium and gold — founder selected',
});

function deny(reason) { throw new Error('guardian_rig_finish_' + reason); }
function finiteRGBA(value) {
  return Array.isArray(value) && value.length===4 &&
    value.every(v=>typeof v==='number' && Number.isFinite(v) && v>=0 && v<=1);
}

export function validateLockedGuardianBlackTitaniumFinish(gltf) {
  const record = gltf?.extras?.STAAR_Guardian_Armor_Finish_Lock;
  if (record?.founderSelected !== LOCKED_GUARDIAN_FULLBODY_FINISH.founderSelected ||
      record?.approvedBuild228FaceSourceSha256 !== LOCKED_GUARDIAN_FULLBODY_FINISH.approvedBuild228FaceSha256 ||
      record?.defaultVariantIndex !== 1 ||
      record?.alternateVariantIndex !== 0 ||
      record?.alternateNotApprovedAsDefault !== true) deny('missing_founder_lock');

  const variants = gltf?.extensions?.KHR_materials_variants?.variants;
  if (!Array.isArray(variants) || variants.length<2 ||
      variants[1]?.name !== LOCKED_GUARDIAN_FULLBODY_FINISH.materialVariantName)
    deny('missing_black_variant');

  const armor = gltf?.meshes?.find(m=>m?.name==='B229_chrome');
  const gilded = gltf?.meshes?.find(m=>m?.name==='B229_gold');
  const armorPrimitive = armor?.primitives?.[0];
  const goldPrimitive = gilded?.primitives?.[0];
  const blackMatId = armorPrimitive?.material;
  const goldMatId = goldPrimitive?.material;
  if (!Number.isInteger(blackMatId) || !Number.isInteger(goldMatId) ||
      record?.defaultMaterialIndex!==blackMatId) deny('missing_default_material');

  const black = gltf?.materials?.[blackMatId];
  const gold = gltf?.materials?.[goldMatId];
  const blackRGBA = black?.pbrMetallicRoughness?.baseColorFactor;
  const goldRGBA = gold?.pbrMetallicRoughness?.baseColorFactor;
  if (!/black_titanium/i.test(black?.name??'') ||
      !finiteRGBA(blackRGBA) ||
      Math.max(...blackRGBA.slice(0,3)) >= 0.30 ||
      !(Number.isFinite(black?.pbrMetallicRoughness?.metallicFactor) && black.pbrMetallicRoughness.metallicFactor >= 0.7))
    deny('default_not_black_titanium');
  if (!/gold/i.test(gold?.name??'') ||
      !finiteRGBA(goldRGBA) ||
      goldRGBA[0] < 0.65 || goldRGBA[1] < 0.35 ||
      goldRGBA[2] >= goldRGBA[0] ||
      !(Number.isFinite(gold?.pbrMetallicRoughness?.metallicFactor) && gold.pbrMetallicRoughness.metallicFactor >= 0.7))
    deny('gold_missing');

  const mappings=armorPrimitive?.extensions?.KHR_materials_variants?.mappings;
  if (!Array.isArray(mappings) ||
      !mappings.some(x=>x.material===blackMatId && Array.isArray(x.variants) && x.variants.includes(1)) ||
      !mappings.some(x=>x.material!==blackMatId && Array.isArray(x.variants) && x.variants.includes(0)))
    deny('reversible_variant_mapping_missing');
  return Object.freeze({defaultMaterialIndex:blackMatId,goldMaterialIndex:goldMatId,
    founderSelected:LOCKED_GUARDIAN_FULLBODY_FINISH.founderSelected,
    defaultBlackTitanium:true,alternateChromeReviewOnly:true});
}
