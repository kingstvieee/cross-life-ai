import test from 'node:test';
import assert from 'node:assert/strict';
import {
 assertGuardianModelNotRejected,
 PRIVATE_BUILD248_CHROME_EAR_CLEANUP_REVIEW_ONLY_SHA256,
 PRIVATE_BUILD248_TITANIUM_EAR_CLEANUP_REVIEW_ONLY_SHA256,
} from '../scene-src/approved-guardian-asset.mjs';
import {
 canActivateArmoredGuardian3D,LOCKED_ARMORED_GUARDIAN,
 PRIVATE_BUILD248_CHROME_EAR_CLEANUP_REVIEW_ONLY_SHA256 as NATIVE_CHROME,
 PRIVATE_BUILD248_TITANIUM_EAR_CLEANUP_REVIEW_ONLY_SHA256 as NATIVE_TITANIUM
} from '../src/guardian-armor-lock.ts';

const assets=[
 ['chrome',PRIVATE_BUILD248_CHROME_EAR_CLEANUP_REVIEW_ONLY_SHA256,NATIVE_CHROME,
  '2a3ef97275db797daa4247297770b3c062051fcc6461adb39c4faa99a8205c8d'],
 ['titanium',PRIVATE_BUILD248_TITANIUM_EAR_CLEANUP_REVIEW_ONLY_SHA256,NATIVE_TITANIUM,
  '3b3ccefe72bd5f9dc3828fc09f8f080c06d7f9f356e771e108e57e6db9d8d525']
];
test('Build248 exact private GLB binaries are pinned and never accidentally imported for production',()=>{
 for(const [variant,builderSHA,nativeSHA,pinnedSHA] of assets){
   assert.equal(builderSHA,pinnedSHA);
   assert.equal(nativeSHA,pinnedSHA);
   assert.throws(()=>assertGuardianModelNotRejected(pinnedSHA),
    new RegExp('guardian_rig_build248_'+variant+'_not_final_artist_or_device_approved'));
 }
});
test('Forged owner art, device, and viseme receipts cannot activate private Build248',()=>{
 const receipt={
  sourceImageSha256:LOCKED_ARMORED_GUARDIAN.sourceImageSha256,
  identityAssetId:'forged-b248-release-receipt',
  founderApprovedRig:true,faceFidelityReviewed:true,
  armorFidelityReviewed:true,frontThreeQuarterProfileReviewed:true,
  speechSyncDeviceVerified:true,
  blendshapeTargets:['rest','sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U']
 };
 for(const [, , ,hash] of assets)
  assert.equal(canActivateArmoredGuardian3D({...receipt,rigModelSha256:hash}),false);
});
