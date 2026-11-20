import test from 'node:test';
import assert from 'node:assert/strict';
import {
 assertGuardianModelNotRejected,
 PRIVATE_BUILD247_CHROME_MATCH_REVIEW_ONLY_SHA256,
 PRIVATE_BUILD247_TITANIUM_MATCH_REVIEW_ONLY_SHA256,
} from '../scene-src/approved-guardian-asset.mjs';
import {
 canActivateArmoredGuardian3D, LOCKED_ARMORED_GUARDIAN,
 PRIVATE_BUILD247_CHROME_MATCH_REVIEW_ONLY_SHA256 as NATIVE_CHROME,
 PRIVATE_BUILD247_TITANIUM_MATCH_REVIEW_ONLY_SHA256 as NATIVE_TITANIUM,
} from '../src/guardian-armor-lock.ts';

const candidates=[
 ['chrome',PRIVATE_BUILD247_CHROME_MATCH_REVIEW_ONLY_SHA256,NATIVE_CHROME,
  '41ee34c1fb2baf82082a7f8aa6426242be0a69df636617858c467f87fb8897a4'],
 ['titanium',PRIVATE_BUILD247_TITANIUM_MATCH_REVIEW_ONLY_SHA256,NATIVE_TITANIUM,
  '22d91cf0f516d95d1f98f1c69826ec8f3219d14daafd8e9e62c9c0b7305d5755']
];
test('Build247 exact GLB candidates remain blocked pending real identity and art acceptance',()=>{
 for(const [variant,src,native,sha] of candidates){
  assert.equal(src,sha);assert.equal(native,sha);
  assert.throws(()=>assertGuardianModelNotRejected(sha),new RegExp('guardian_rig_build247_'+variant+'_visual_match_not_owner_accepted'));
 }
});
test('Positive-looking receipts cannot bypass exact private Build247 production quarantine',()=>{
 const forged={
  sourceImageSha256:LOCKED_ARMORED_GUARDIAN.sourceImageSha256,
  identityAssetId:'forged-build247-final',founderApprovedRig:true,
  faceFidelityReviewed:true,armorFidelityReviewed:true,
  frontThreeQuarterProfileReviewed:true,speechSyncDeviceVerified:true,
  blendshapeTargets:['rest','sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U']
 };
 for(const [,sha] of candidates)
  assert.equal(canActivateArmoredGuardian3D({...forged,rigModelSha256:sha}),false);
});
