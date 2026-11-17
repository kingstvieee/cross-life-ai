import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  PRIVATE_BUILD231_CHROME_GOLD_RIG_QA_SHA256 as importerChrome,
  PRIVATE_BUILD232_BLACK_TITANIUM_RIG_QA_SHA256 as importerBlack232,
  assertGuardianModelNotRejected
} from '../scene-src/approved-guardian-asset.mjs';
import {
  PRIVATE_BUILD231_CHROME_GOLD_RIG_QA_SHA256 as nativeChrome,
  PRIVATE_BUILD232_BLACK_TITANIUM_RIG_QA_SHA256 as nativeBlack232,
  LOCKED_BUILD229_FULLBODY_ARMOR_FINISH,LOCKED_ARMORED_GUARDIAN,
  canActivateArmoredGuardian3D
} from '../src/guardian-armor-lock.ts';

const CHROME='cca5092a8971c7817dab3301b4540c8a9b53844bc1aa0257840bf9db957a077c';

test('private chrome/gold rig is byte-identified, protected and leaves concurrent finish authority unchanged',async()=>{
 const record=JSON.parse(await readFile(new URL('../scene-src/build231-chromegold-private-qa.json',import.meta.url),'utf8'));
 assert.equal(record.build231GlbSha256,CHROME);
 assert.equal(record.selectedInThisReview,'chrome-and-gold');
 assert.equal(record.noChangesToExistingBuild232Finish,true);
 assert.equal(record.approvedFaceBuild228Sha256,'4d739795c55711a19cd6c4ccb670053697b3ed8e23c2e3648940dac43433540b');
 assert.equal(record.offlineRigQa.skinnedBodyVertices,83446);
 assert.equal(record.offlineRigQa.rigidComponents,480);
 assert.equal(record.physicalIphoneSyncVerified,false);
 assert.equal(record.appStoreSigned,false);
 assert.equal(record.productionReleaseAuthorized,false);
 assert.equal(nativeChrome,CHROME);
 assert.equal(importerChrome,CHROME);
 assert.throws(()=>assertGuardianModelNotRejected(CHROME),/guardian_rig_build231_chrome_gold_private_rig_not_approved/);
});

test('neither experimental chrome nor existing experimental black Build232 is approved by fake receipts',()=>{
 assert.equal(nativeBlack232,importerBlack232);
 const template={sourceImageSha256:LOCKED_ARMORED_GUARDIAN.sourceImageSha256,identityAssetId:'not-real-production',
 founderApprovedRig:true,faceFidelityReviewed:true,armorFidelityReviewed:true,frontThreeQuarterProfileReviewed:true,
 speechSyncDeviceVerified:true,blendshapeTargets:['rest','sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U']};
 assert.equal(canActivateArmoredGuardian3D({...template,rigModelSha256:CHROME}),false);
 assert.equal(canActivateArmoredGuardian3D({...template,rigModelSha256:nativeBlack232}),false);
 assert.equal(LOCKED_BUILD229_FULLBODY_ARMOR_FINISH.bodyRigAccepted,false);
});
