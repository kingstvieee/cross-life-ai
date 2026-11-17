import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  LOCKED_GUARDIAN_ARMOR_FINISH, PRIVATE_BUILD231_REFINED_RIG_QA_SHA256,
  canActivateArmoredGuardian3D
} from '../src/guardian-armor-lock.ts';
import {
  LOCKED_GUARDIAN_ARMOR_FINISH as IMPORTER_LOCKED_FINISH,
  BUILD228_APPROVED_FACE_BINARY_PREFIX,
  assertGuardianModelNotRejected,
} from '../scene-src/approved-guardian-asset.mjs';

const SHA231='cca5092a8971c7817dab3301b4540c8a9b53844bc1aa0257840bf9db957a077c';
const SHA228='4d739795c55711a19cd6c4ccb670053697b3ed8e23c2e3648940dac43433540b';

test('Build 231 founder chrome-and-gold lock is exact in native runtime, importer and review register',async()=>{
 const record=JSON.parse(await readFile(new URL('../scene-src/build231-chromegold-rig-review.json',import.meta.url),'utf8'));
 assert.equal(record.ownerDecision.finish,'chrome-and-gold');
 assert.equal(record.ownerDecision.sourceBuild,229);
 assert.equal(record.ownerDecision.approvedFaceModelSha256,SHA228);
 assert.equal(record.sourceAssets.privateBuild231Sha256,SHA231);
 assert.equal(record.sourceAssets.approvedBuild228BinPrefix.sha256,BUILD228_APPROVED_FACE_BINARY_PREFIX.sha256);
 assert.equal(record.sourceAssets.materialEvidence.defaultVariantIndex,0);
 assert.equal(record.sourceAssets.materialEvidence.chromeMaterialIndex,18);
 assert.equal(record.sourceAssets.materialEvidence.goldMaterialIndex,20);
 assert.equal(record.release.founderApprovedFinish,true);
 assert.equal(record.release.founderApprovedFullBodyRig,false);
 assert.equal(record.release.iphoneLipSyncVerified,false);
 assert.equal(record.release.signedAppleIpaVerified,false);
 assert.equal(record.release.testFlightUploadCompleted,false);
 assert.equal(record.release.productionAllowed,false);
 assert.equal(record.release.directAdditionalSpendCAD,0);
 assert.equal(LOCKED_GUARDIAN_ARMOR_FINISH.id,IMPORTER_LOCKED_FINISH);
 assert.equal(LOCKED_GUARDIAN_ARMOR_FINISH.approvedFaceBuild228Sha256,SHA228);
 assert.equal(PRIVATE_BUILD231_REFINED_RIG_QA_SHA256,SHA231);
 assert.throws(()=>assertGuardianModelNotRejected(SHA231),/guardian_rig_build231_refined_rig_not_device_approved/);
});

test('Build 231 has quantified private CPU QA, not claimed physical walking certification',async()=>{
 const {rigQa,release}=JSON.parse(await readFile(new URL('../scene-src/build231-chromegold-rig-review.json',import.meta.url),'utf8'));
 assert.equal(rigQa.bodyVertices,83446);
 assert.equal(rigQa.bodyJointCount,16);
 assert.equal(rigQa.rigidArmourComponents,480);
 assert.equal(rigQa.rigidVertices+rigQa.softVertices,rigQa.bodyVertices);
 assert.equal(rigQa.originalHeadMorphTargetsPreserved,16);
 assert.equal(rigQa.originalFaceAnimationsPreserved,3);
 assert.deepEqual(rigQa.poseTimesSeconds,[0,0.5,1,1.5,2]);
 assert.ok(rigQa.maxSampledRigidComponentDistanceErrorMeters<0.00001);
 assert.ok(rigQa.maxSampledVertexTravelMeters<0.65);
 assert.equal(release.tenWorldNativeCollisionVerified,false);
 assert.equal(release.starCenttinelRecoveryVerified,false);
 assert.equal(release.easInspectedArchiveVerified,false);
 assert.equal(release.productionAllowed,false);
});

test('Build 231 cannot be activated by forged all-true flags or the rejected alternative finish',()=>{
 const valid={
  sourceImageSha256:'d7f18158a91778a7f3ce97c7326b1c75afefdc792c77ab02c4fead0e3ffa659c',
  identityAssetId:'test-rig',rigModelSha256:SHA231,armorFinish:'chrome-and-gold',
  founderApprovedRig:true,faceFidelityReviewed:true,armorFidelityReviewed:true,
  frontThreeQuarterProfileReviewed:true,speechSyncDeviceVerified:true,
  blendshapeTargets:['rest','sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U'],
 };
 assert.equal(canActivateArmoredGuardian3D(valid),false);
 assert.equal(canActivateArmoredGuardian3D({...valid,armorFinish:'black-titanium-and-gold'}),false);
});
