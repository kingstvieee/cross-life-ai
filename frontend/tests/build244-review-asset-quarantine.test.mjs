import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertGuardianModelNotRejected,
  PRIVATE_BUILD241_REVIEW_ONLY_SHA256, PRIVATE_BUILD242_REVIEW_ONLY_SHA256,
  PRIVATE_BUILD243_REVIEW_ONLY_SHA256, PRIVATE_BUILD244_REVIEW_ONLY_SHA256,
} from '../scene-src/approved-guardian-asset.mjs';
import {
  canActivateArmoredGuardian3D,LOCKED_ARMORED_GUARDIAN,
  PRIVATE_BUILD241_REVIEW_ONLY_SHA256 as NATIVE241,
  PRIVATE_BUILD242_REVIEW_ONLY_SHA256 as NATIVE242,
  PRIVATE_BUILD243_REVIEW_ONLY_SHA256 as NATIVE243,
  PRIVATE_BUILD244_REVIEW_ONLY_SHA256 as NATIVE244,
} from '../src/guardian-armor-lock.ts';

const CANDIDATES=[
 ['241',PRIVATE_BUILD241_REVIEW_ONLY_SHA256,NATIVE241,'667f68dc172cd8dde66b25227604929582d2b86e39e50c1eb87a368e94bd59da'],
 ['242',PRIVATE_BUILD242_REVIEW_ONLY_SHA256,NATIVE242,'8c2ed15001070453e232809492de8916d2e46313d835d21556e6a8fc80dcb768'],
 ['243',PRIVATE_BUILD243_REVIEW_ONLY_SHA256,NATIVE243,'804f4e0f714bcbde63572d8ac83cb11a9a6c2e6ee888117b749a591df163ae78'],
 ['244',PRIVATE_BUILD244_REVIEW_ONLY_SHA256,NATIVE244,'afdf2b3deccc96786faf7cc8357f2d9abed9dd20796bec7b6bd848ff8cc5cfcc']
];
test('Private Guardian 241–244 binary identities are byte pinned and blocked by importer',()=>{
 for(const [version,source,device,expected] of CANDIDATES){
  assert.equal(source,expected,version+' source');
  assert.equal(device,expected,version+' native');
  assert.throws(()=>assertGuardianModelNotRejected(expected),
    new RegExp('guardian_rig_build'+version+'_private_qa_unapproved'));
 }
});
test('Native release refuses even all-true fake owner/art/device receipts for Build 241–244',()=>{
 const forged={
  sourceImageSha256:LOCKED_ARMORED_GUARDIAN.sourceImageSha256,
  identityAssetId:'forged-owner-final',founderApprovedRig:true,
  faceFidelityReviewed:true,armorFidelityReviewed:true,
  frontThreeQuarterProfileReviewed:true,speechSyncDeviceVerified:true,
  blendshapeTargets:['rest','sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U']
 };
 for(const [version,source] of CANDIDATES){
  assert.equal(canActivateArmoredGuardian3D({...forged,rigModelSha256:source}),false,version);
 }
});
