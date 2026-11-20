import test from 'node:test';
import assert from 'node:assert/strict';
import {assertGuardianModelNotRejected,PRIVATE_BUILD249_FACE_COLLAR_REVIEW_SHA256} from '../scene-src/approved-guardian-asset.mjs';
import {canActivateArmoredGuardian3D,LOCKED_ARMORED_GUARDIAN,PRIVATE_BUILD249_FACE_COLLAR_REVIEW_SHA256 as NATIVE_SHA} from '../src/guardian-armor-lock.ts';
const sha='f2465c2a670af1e22d884689253bffc6ade39094313d11be7269f00e26774114';
test('Build249 locked reference projection and raised collar cannot be shipped through importer or native spoofed owner receipts',()=>{
 assert.equal(PRIVATE_BUILD249_FACE_COLLAR_REVIEW_SHA256,sha);
 assert.equal(NATIVE_SHA,sha);
 assert.throws(()=>assertGuardianModelNotRejected(sha),/guardian_rig_build249_private_likeness_and_device_not_approved/);
 const fake={sourceImageSha256:LOCKED_ARMORED_GUARDIAN.sourceImageSha256,
   identityAssetId:'forged-art-acceptance',founderApprovedRig:true,
   faceFidelityReviewed:true,armorFidelityReviewed:true,
   frontThreeQuarterProfileReviewed:true,speechSyncDeviceVerified:true,
   blendshapeTargets:['rest','sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U'],
   rigModelSha256:sha};
 assert.equal(canActivateArmoredGuardian3D(fake),false);
});
