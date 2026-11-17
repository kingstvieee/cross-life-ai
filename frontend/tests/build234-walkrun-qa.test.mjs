import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PRIVATE_BUILD234_WALK_RUN_QA_SHA256 as importedSha, assertGuardianModelNotRejected} from '../scene-src/approved-guardian-asset.mjs';
import {PRIVATE_BUILD234_WALK_RUN_QA_SHA256 as nativeSha, LOCKED_ARMORED_GUARDIAN, canActivateArmoredGuardian3D} from '../src/guardian-armor-lock.ts';
const SHA='2ae8eda577a5f60a0c82bb73d04be8280065acba9083b7c4d480e572cb0a58b8';
test('Build234 preserves exact founder-approved Build228 facial and two independent body cycles',async()=>{
 const record=JSON.parse(await readFile(new URL('../scene-src/build234-walkrun-private-qa.json',import.meta.url),'utf8'));
 assert.equal(record.modelSha256,SHA);
 assert.equal(record.modelBytes,10708008);
 assert.equal(record.approvedFaceBuild228Sha256,'4d739795c55711a19cd6c4ccb670053697b3ed8e23c2e3648940dac43433540b');
 assert.equal(record.protectedOriginalFaceBinSha256,'ee78ab8bc97a7cad9853c878ace2d11d528ca9f4f981a0d5aff75ac8fc89c03d');
 assert.equal(record.preservedOriginalFacialAnimations,3);
 assert.equal(record.preservedFacialMorphTargets,16);
 assert.equal(record.prototypeBodyJoints,16);
 assert.deepEqual(record.bodyAnimationClips.map(c=>c.clip),['WALK_IN_PLACE_BODY_QA','RUN_IN_PLACE_BODY_QA']);
 for(const c of record.bodyAnimationClips){
   assert.equal(c.sampledFrames,65);
   assert.equal(c.tracks,13);
   assert.ok(c.maxStanceSlipM<0.000001);
   assert.ok(c.maxFootLiftM>0.1);
 }
 assert.equal(record.qa.independentCpuForwardKinematicsPassed,true);
 assert.equal(record.qa.professionallyNaturalAnimationAccepted,false);
 assert.equal(record.qa.physicalIphonePlaybackVerified,false);
 assert.equal(record.qa.appleSignedIPA,false);
 assert.equal(record.qa.productionAllowed,false);
 assert.equal(record.additionalExternalSpendCAD,0);
});
test('Build234 private rig never becomes the production Guardian with forged all-true flags',()=>{
 assert.equal(importedSha,SHA);
 assert.equal(nativeSha,SHA);
 assert.throws(()=>assertGuardianModelNotRejected(SHA),/guardian_rig_build234_private_walk_run_not_device_approved/);
 const fake={
   sourceImageSha256:LOCKED_ARMORED_GUARDIAN.sourceImageSha256,
   identityAssetId:'fake-approved-guardian',rigModelSha256:SHA,
   armorFinish:'black-titanium-and-gold',founderApprovedRig:true,
   faceFidelityReviewed:true,armorFidelityReviewed:true,
   frontThreeQuarterProfileReviewed:true,speechSyncDeviceVerified:true,
   blendshapeTargets:['rest','sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U']
 };
 assert.equal(canActivateArmoredGuardian3D(fake),false);
 assert.equal(canActivateArmoredGuardian3D({...fake,armorFinish:'chrome-and-gold'}),false);
});
