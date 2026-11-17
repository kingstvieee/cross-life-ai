import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  LOCKED_BUILD229_FULLBODY_ARMOR_FINISH,
  LOCKED_ARMORED_GUARDIAN,
  PRIVATE_BUILD231_BLACK_TITANIUM_RIG_REVIEW_SHA256 as nativeSha,
  canActivateArmoredGuardian3D,
} from '../src/guardian-armor-lock.ts';
import {
  PRIVATE_BUILD231_BLACK_TITANIUM_RIG_REVIEW_SHA256 as importerSha,
  assertGuardianModelNotRejected
} from '../scene-src/approved-guardian-asset.mjs';

const FACE='4d739795c55711a19cd6c4ccb670053697b3ed8e23c2e3648940dac43433540b';
const HISTORICAL_BLACK='91bac844779ea58cb45804efd4ffe441f68fab6c2dbbae11e8868f7418b04fbc';

test('historical black titanium option does not override founder locked chrome and gold or approved face',async()=>{
 const lock=JSON.parse(await readFile(new URL('../scene-src/build231-locked-fullbody-armor-finish.json',import.meta.url),'utf8'));
 assert.equal(lock.founderSelection,'CHROME + GOLD');
 assert.equal(lock.selectedMaterialVariant,0);
 assert.equal(lock.selectedPbrMaterialIndex,18);
 assert.equal(lock.alternateBlackTitaniumMaterialIndex,23);
 assert.equal(lock.alternateBlackTitaniumNotApprovedAsDefault,true);
 assert.equal(lock.faceLock.founderApprovedBuild228Sha256,FACE);
 assert.equal(lock.faceLock.preserveExactHeadGeometry,true);
 assert.equal(lock.faceLock.preserveOriginalFacialAnimations,3);
 assert.equal(lock.provenance.quarantinedHistoricalBlackTitaniumRigSha256,HISTORICAL_BLACK);
 assert.equal(lock.acceptance.build231RigArtistAccepted,false);
 assert.equal(lock.acceptance.signedIpaVerified,false);
 assert.equal(lock.readyForProduction,false);
 assert.equal(LOCKED_BUILD229_FULLBODY_ARMOR_FINISH.name,'chrome + gold');
 assert.equal(LOCKED_BUILD229_FULLBODY_ARMOR_FINISH.variantIndex,0);
 assert.equal(LOCKED_BUILD229_FULLBODY_ARMOR_FINISH.approvedFaceModelSha256,FACE);
 assert.equal(LOCKED_BUILD229_FULLBODY_ARMOR_FINISH.bodyRigAccepted,false);
 assert.equal(LOCKED_ARMORED_GUARDIAN.approval,'2d-character-appearance-only');
});

test('historical black titanium QA GLB remains forbidden even with forged receipt',()=>{
 assert.equal(nativeSha,HISTORICAL_BLACK);
 assert.equal(importerSha,HISTORICAL_BLACK);
 assert.throws(()=>assertGuardianModelNotRejected(HISTORICAL_BLACK),/guardian_rig_build231_artist_and_device_not_certified/);
 const forged={
  sourceImageSha256:LOCKED_ARMORED_GUARDIAN.sourceImageSha256,
  identityAssetId:'historical-black-review-only',rigModelSha256:HISTORICAL_BLACK,
  armorFinish:'black-titanium-and-gold',
  founderApprovedRig:true,faceFidelityReviewed:true,armorFidelityReviewed:true,
  frontThreeQuarterProfileReviewed:true,speechSyncDeviceVerified:true,
  blendshapeTargets:['rest','sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U']
 };
 assert.equal(canActivateArmoredGuardian3D(forged),false);
 assert.equal(canActivateArmoredGuardian3D({...forged,armorFinish:'chrome-and-gold'}),false);
});
