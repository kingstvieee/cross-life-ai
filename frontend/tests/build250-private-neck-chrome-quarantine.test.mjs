import test from 'node:test';
import assert from 'node:assert/strict';
import {
 assertGuardianModelNotRejected,PRIVATE_BUILD250_CHROME_NECK_REVIEW_SHA256
} from '../scene-src/approved-guardian-asset.mjs';
import {
 canActivateArmoredGuardian3D,LOCKED_ARMORED_GUARDIAN,
 PRIVATE_BUILD250_CHROME_NECK_REVIEW_SHA256 as NATIVE
} from '../src/guardian-armor-lock.ts';
const SHA='057099cac71e04d6e1282b23fb52c9d593b8c1a4e055309254ca1f5609a42134';

test('Build250 exact model stays private and cannot bypass either release boundary',()=>{
 assert.equal(PRIVATE_BUILD250_CHROME_NECK_REVIEW_SHA256,SHA);
 assert.equal(NATIVE,SHA);
 assert.throws(()=>assertGuardianModelNotRejected(SHA),
  /guardian_rig_build250_private_art_device_not_approved/);
});

test('Invalid owner/device boolean self-attestations do not activate the B250 model',()=>{
 const fake={
  sourceImageSha256:LOCKED_ARMORED_GUARDIAN.sourceImageSha256,
  identityAssetId:'fake-b250-owner-approval',rigModelSha256:SHA,
  founderApprovedRig:true,faceFidelityReviewed:true,
  armorFidelityReviewed:true,frontThreeQuarterProfileReviewed:true,
  speechSyncDeviceVerified:true,
  blendshapeTargets:['rest','sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U']
 };
 assert.equal(canActivateArmoredGuardian3D(fake),false);
});
