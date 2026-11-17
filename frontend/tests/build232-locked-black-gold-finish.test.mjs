import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LOCKED_GUARDIAN_FULLBODY_FINISH,
  validateLockedGuardianBlackTitaniumFinish
} from '../scene-src/locked-guardian-armor-finish.mjs';
import {
  PRIVATE_BUILD232_BLACK_TITANIUM_RIG_QA_SHA256,
  assertGuardianModelNotRejected
} from '../scene-src/approved-guardian-asset.mjs';
import {
  LOCKED_ARMORED_GUARDIAN,
  LOCKED_BUILD229_FULLBODY_ARMOR_FINISH,
  canActivateArmoredGuardian3D,
  PRIVATE_BUILD232_BLACK_TITANIUM_RIG_QA_SHA256 as RUNTIME_DENIED_SHA
} from '../src/guardian-armor-lock.ts';

function candidate() {
  return {
    extras:{STAAR_Guardian_Armor_Finish_Lock:{
      founderSelected:'black-titanium-and-gold',
      approvedBuild228FaceSourceSha256:LOCKED_GUARDIAN_FULLBODY_FINISH.approvedBuild228FaceSha256,
      defaultMaterialIndex:1,defaultVariantIndex:1,alternateVariantIndex:0,
      alternateNotApprovedAsDefault:true
    }},
    extensions:{KHR_materials_variants:{variants:[
      {name:'Legacy chrome and gold — review only'},
      {name:LOCKED_GUARDIAN_FULLBODY_FINISH.materialVariantName},
    ]}},
    materials:[
      {name:'unused'},
      {name:'B229_VARIANT_black_titanium_no_silver',
        pbrMetallicRoughness:{baseColorFactor:[0.1,0.105,0.12,1],metallicFactor:0.95}},
      {name:'B229_polished_gold',
        pbrMetallicRoughness:{baseColorFactor:[1,0.77,0.34,1],metallicFactor:1}},
      {name:'B229_mirror_chrome_armor',
        pbrMetallicRoughness:{baseColorFactor:[0.9,0.91,0.93,1],metallicFactor:1}},
    ],
    meshes:[
      {name:'B229_chrome',primitives:[{material:1,extensions:{
        KHR_materials_variants:{mappings:[{material:3,variants:[0]},{material:1,variants:[1]}]}
      }}]},
      {name:'B229_gold',primitives:[{material:2}]}
    ]
  };
}
test('Build232 founder lock is exact black titanium as default, gold intact, silver variant selectable only',()=>{
  const result=validateLockedGuardianBlackTitaniumFinish(candidate());
  assert.equal(result.founderSelected,'black-titanium-and-gold');
  assert.equal(result.defaultMaterialIndex,1);
  assert.equal(result.goldMaterialIndex,2);
  assert.equal(result.alternateChromeReviewOnly,true);
  assert.equal(LOCKED_BUILD229_FULLBODY_ARMOR_FINISH.productionColorIntent,'black-titanium-gold');
  assert.equal(LOCKED_ARMORED_GUARDIAN.approval,'2d-character-appearance-only');
});
test('Chrome default or false metadata cannot pass the production finish contract',()=>{
  const fixture=candidate();
  for(const mutate of [
    a=>{a.meshes[0].primitives[0].material=3;},
    a=>{a.extras.STAAR_Guardian_Armor_Finish_Lock.founderSelected='chrome-and-gold';},
    a=>{a.extras.STAAR_Guardian_Armor_Finish_Lock.defaultMaterialIndex=3;},
    a=>{a.materials[1].pbrMetallicRoughness.baseColorFactor=[.91,.91,.92,1];},
    a=>{delete a.materials[1].pbrMetallicRoughness.metallicFactor;},
    a=>{a.materials[2].pbrMetallicRoughness.baseColorFactor=[.4,.4,.8,1];},
    a=>{delete a.materials[2].pbrMetallicRoughness.metallicFactor;},
    a=>{a.meshes[0].primitives[0].extensions.KHR_materials_variants.mappings=[];},
    a=>{delete a.extensions.KHR_materials_variants;},
  ]){
    const altered=candidate();mutate(altered);
    assert.throws(()=>validateLockedGuardianBlackTitaniumFinish(altered),/guardian_rig_finish_/);
  }
});
test('Build232 exact review-only black rig cannot be activated even with forged founder/device booleans',()=>{
  const expected='ecc3c9660cd3bacef39c5ca28193b2c67a4ec5ff433c77347ce58b741bc456f9';
  assert.equal(PRIVATE_BUILD232_BLACK_TITANIUM_RIG_QA_SHA256,expected);
  assert.equal(RUNTIME_DENIED_SHA,expected);
  assert.throws(()=>assertGuardianModelNotRejected(expected),/guardian_rig_build232_private_rig_not_device_certified/);
  const fullyForged={
    sourceImageSha256:LOCKED_ARMORED_GUARDIAN.sourceImageSha256,
    identityAssetId:'fake-final-model', rigModelSha256:expected,
    founderApprovedRig:true,faceFidelityReviewed:true,armorFidelityReviewed:true,
    frontThreeQuarterProfileReviewed:true,speechSyncDeviceVerified:true,
    blendshapeTargets:['rest','sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U']
  };
  assert.equal(canActivateArmoredGuardian3D(fullyForged),false);
});

test('Owner black finish and Build228 face stay approved without manufacturing rig or Apple acceptance',async()=>{
  const {readFile}=await import('node:fs/promises');
  const state=JSON.parse(await readFile(new URL('../scene-src/build232-armor-finish-lock.json',import.meta.url),'utf8'));
  assert.equal(state.founderApprovedAppearance.bodyArmorFinish,'black-titanium-and-gold');
  assert.equal(state.founderApprovedAppearance.faceBuild,228);
  assert.equal(state.founderApprovedAppearance.faceModelSha256,LOCKED_GUARDIAN_FULLBODY_FINISH.approvedBuild228FaceSha256);
  assert.equal(state.privateModelCandidate.sha256,'ecc3c9660cd3bacef39c5ca28193b2c67a4ec5ff433c77347ce58b741bc456f9');
  assert.equal(state.binarySpecificAcceptance.fullBodySkinWeightsAccepted,false);
  assert.equal(state.binarySpecificAcceptance.physicalIphoneLipSyncAccepted,false);
  assert.equal(state.binarySpecificAcceptance.signedAppleIPAProduced,false);
  assert.equal(state.productionReleaseAllowed,false);
});
