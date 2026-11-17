import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  PRIVATE_BUILD233_CHROME_FOOT_PLANT_QA_SHA256 as importHash,
  assertGuardianModelNotRejected
} from '../scene-src/approved-guardian-asset.mjs';
import {
  PRIVATE_BUILD233_CHROME_FOOT_PLANT_QA_SHA256 as runtimeHash,
  LOCKED_ARMORED_GUARDIAN,
  canActivateArmoredGuardian3D,
  armoredGuardianFacialRig
} from '../src/guardian-armor-lock.ts';

const HASH233='66e6821f4e776ac7a957e8a566de71731a555cdc006714e1e448d58a85fb80dc';
const HASH228='4d739795c55711a19cd6c4ccb670053697b3ed8e23c2e3648940dac43433540b';

test('private Build233 source and exact-binary QA are not Apple release evidence',async()=>{
 const report=JSON.parse(await readFile(new URL('../scene-src/build233-private-foot-contact-review.json',import.meta.url),'utf8'));
 assert.equal(report.schema,'staarwardd-guardian-build233-private-foot-qa-v1');
 assert.equal(report.sha256,HASH233);
 assert.equal(report.bytes,10674004);
 assert.equal(report.sourceApprovedFaceBuild228Sha256,HASH228);
 assert.equal(report.protectedFaceBinary.size,4735136);
 assert.equal(report.protectedFaceBinary.sha256,'ee78ab8bc97a7cad9853c878ace2d11d528ca9f4f981a0d5aff75ac8fc89c03d');
 assert.equal(report.styleOfThisPrivateCandidate,'chrome-and-gold');
 assert.equal(report.currentProductionFinishUnmodified,true);
 assert.equal(report.rig.bodyVertices,83446);
 assert.equal(report.rig.originalMorphTargets,16);
 assert.equal(report.rig.originalFaceAnimations,3);
 assert.equal(report.rig.footCounterRotationTracksAdded,2);
 assert.deepEqual(report.rig.sampleTimesSeconds,[0,.25,.5,.75,1,1.25,1.5,1.75,2]);
 assert.ok(report.rig.plantedLeftDriftMeters<0.000001);
 assert.ok(report.rig.plantedRightDriftMeters<0.000001);
 assert.ok(report.rig.swingFootClearanceMeters>0.04);
 assert.ok(report.rig.rigidPanelMaxLengthErrorMeters<0.000001);
 assert.equal(report.acceptance.founderApprovedBodyRig,false);
 assert.equal(report.acceptance.naturalWalkAccepted,false);
 assert.equal(report.acceptance.actualFootFloorColliderVerified,false);
 assert.equal(report.acceptance.realIphoneVisemePassed,false);
 assert.equal(report.acceptance.appleIpaSigned,false);
 assert.equal(report.acceptance.testflightSubmitted,false);
 assert.equal(report.productionReleaseAllowed,false);
 assert.equal(report.externalPaidExpenseCAD,0);
});

test('Build233 exact hash rejected in both runtime and importer despite fabricated positive receipts',()=>{
 assert.equal(importHash,HASH233);
 assert.equal(runtimeHash,HASH233);
 assert.throws(()=>assertGuardianModelNotRejected(HASH233),/guardian_rig_build233_private_foot_qa_not_device_approved/);
 const forged={
  sourceImageSha256:LOCKED_ARMORED_GUARDIAN.sourceImageSha256,
  identityAssetId:'forged-build233',
  rigModelSha256:HASH233,
  founderApprovedRig:true,
  faceFidelityReviewed:true,
  armorFidelityReviewed:true,
  frontThreeQuarterProfileReviewed:true,
  speechSyncDeviceVerified:true,
  blendshapeTargets:['rest','sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U']
 };
 assert.equal(canActivateArmoredGuardian3D({...forged,armorFinish:'chrome-and-gold'}),false);
 assert.equal(canActivateArmoredGuardian3D({...forged,armorFinish:'black-titanium-and-gold'}),false);
 assert.equal(armoredGuardianFacialRig({...forged,armorFinish:'chrome-and-gold'}),null);
});
