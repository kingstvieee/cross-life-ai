import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  LOCKED_BUILD229_FULLBODY_ARMOR_FINISH,
  LOCKED_ARMORED_GUARDIAN,
  PRIVATE_BUILD231_BLACK_TITANIUM_RIG_REVIEW_SHA256 as nativeSha,
  canActivateArmoredGuardian3D,
  armoredGuardianFacialRig,
} from '../src/guardian-armor-lock.ts';
import {
  PRIVATE_BUILD231_BLACK_TITANIUM_RIG_REVIEW_SHA256 as importSha,
  assertGuardianModelNotRejected,
} from '../scene-src/approved-guardian-asset.mjs';

const BUILD228='4d739795c55711a19cd6c4ccb670053697b3ed8e23c2e3648940dac43433540b';
const BUILD231='91bac844779ea58cb45804efd4ffe441f68fab6c2dbbae11e8868f7418b04fbc';

test('founder locks black titanium + gold only for full-body armour, without replacing the approved face', async () => {
  const lock = JSON.parse(await readFile(new URL('../scene-src/build231-locked-fullbody-armor-finish.json', import.meta.url),'utf8'));
  assert.equal(lock.founderSelection,'BLACK TITANIUM + GOLD');
  assert.equal(lock.selectedMaterialVariant,1);
  assert.equal(lock.selectedPbrMaterialIndex,23);
  assert.equal(lock.originalChromeMaterialIndex,18);
  assert.equal(lock.faceLock.founderApprovedBuild228Sha256, BUILD228);
  assert.equal(lock.faceLock.preserveExactHeadGeometry,true);
  assert.equal(lock.faceLock.preserveOriginalFacialAnimations,3);
  assert.equal(lock.provenance.privateBuild231QaSha256, BUILD231);
  assert.equal(lock.acceptance.founderColorFinishSelected,true);
  assert.equal(lock.acceptance.build231RigArtistAccepted,false);
  assert.equal(lock.acceptance.signedIpaVerified,false);
  assert.equal(lock.readyForProduction,false);
  assert.equal(LOCKED_BUILD229_FULLBODY_ARMOR_FINISH.name,'black titanium + gold');
  assert.equal(LOCKED_BUILD229_FULLBODY_ARMOR_FINISH.approvedFaceModelSha256,BUILD228);
  assert.equal(LOCKED_BUILD229_FULLBODY_ARMOR_FINISH.bodyRigAccepted,false);
  assert.equal(LOCKED_ARMORED_GUARDIAN.approval,'2d-character-appearance-only');
});

test('private Build 231 must not activate even with forged all-true release receipt', () => {
  assert.equal(nativeSha,BUILD231);
  assert.equal(importSha,BUILD231);
  assert.throws(()=>assertGuardianModelNotRejected(BUILD231),/guardian_rig_build231_artist_and_device_not_certified/);
  const forged = {
    sourceImageSha256:LOCKED_ARMORED_GUARDIAN.sourceImageSha256,
    identityAssetId:'forged-b231',
    rigModelSha256:BUILD231,
    founderApprovedRig:true,faceFidelityReviewed:true,armorFidelityReviewed:true,
    frontThreeQuarterProfileReviewed:true,speechSyncDeviceVerified:true,
    blendshapeTargets:['rest','sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U'],
  };
  assert.equal(canActivateArmoredGuardian3D(forged),false);
  assert.equal(armoredGuardianFacialRig(forged),null);
});
