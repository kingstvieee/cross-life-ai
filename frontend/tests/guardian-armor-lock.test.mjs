import test from 'node:test';
import assert from 'node:assert/strict';
import { GUARDIAN_VISEMES, mayAnimateApprovedGuardianFace } from '../src/guardian-visemes.ts';
import { LOCKED_ARMORED_GUARDIAN, REJECTED_BUILD202_GUARDIAN_MODEL_SHA256, PRIVATE_BUILD208_QA_ONLY_MODEL_SHA256, PRIVATE_BUILD222_UNAPPROVED_ARTIST_MODEL_SHA256, PRIVATE_BUILD225_UNAPPROVED_MULTIVIEW_SHA256, PRIVATE_BUILD227_UNAPPROVED_PROFILE_QA_SHA256, PRIVATE_BUILD228_OWNER_VISUAL_APPROVED_DEVICE_PENDING_SHA256, REJECTED_LEGACY_GUARDIAN_MODEL_SHA256, canActivateArmoredGuardian3D, armoredGuardianFacialRig } from '../src/guardian-armor-lock.ts';

const reference = LOCKED_ARMORED_GUARDIAN;
const valid = {
  sourceImageSha256: reference.sourceImageSha256,
  identityAssetId: 'guardian-armor-v1-production-model',
  rigModelSha256: 'a'.repeat(64),
  founderApprovedRig: true, faceFidelityReviewed: true,
  armorFidelityReviewed: true, frontThreeQuarterProfileReviewed: true,
  speechSyncDeviceVerified: true,
  blendshapeTargets: GUARDIAN_VISEMES,
};
test('locked visual is a fingerprinted, approved ARMOURED design, not a model', () => {
  assert.equal(reference.approval, '2d-character-appearance-only');
  assert.equal(reference.sourceImageSha256, 'd7f18158a91778a7f3ce97c7326b1c75afefdc792c77ab02c4fead0e3ffa659c');
  assert.equal(reference.sourceWidth, 1199);
  assert.equal(reference.sourceHeight, 1312);
  assert.ok(reference.visualRequirements.some(x => x.includes('maple-leaf')));
  assert.ok(reference.visualRequirements.some(x => x.includes('not a tracksuit')));
});
test('no rig enters runtime without exact reference and every founder acceptance gate', () => {
  assert.equal(canActivateArmoredGuardian3D(null), false);
  assert.equal(canActivateArmoredGuardian3D({ ...valid, founderApprovedRig: false }), false);
  assert.equal(canActivateArmoredGuardian3D({ ...valid, sourceImageSha256: 'b'.repeat(64) }), false);
  assert.equal(canActivateArmoredGuardian3D({ ...valid, rigModelSha256: '' }), false);
  assert.equal(canActivateArmoredGuardian3D({ ...valid, armorFidelityReviewed: false }), false);
  assert.equal(canActivateArmoredGuardian3D({ ...valid, faceFidelityReviewed: false }), false);
  assert.equal(canActivateArmoredGuardian3D({ ...valid, frontThreeQuarterProfileReviewed: false }), false);
  assert.equal(canActivateArmoredGuardian3D({ ...valid, speechSyncDeviceVerified: false }), false);
  assert.equal(canActivateArmoredGuardian3D({ ...valid, blendshapeTargets: ['rest'] }), false);
  assert.equal(canActivateArmoredGuardian3D(valid), true);
});
test('only a verified armoured model can create the original facial runtime approval', () => {
  assert.equal(armoredGuardianFacialRig(null), null);
  assert.equal(armoredGuardianFacialRig({ ...valid, faceFidelityReviewed: false }), null);
  const rig = armoredGuardianFacialRig(valid);
  assert.equal(mayAnimateApprovedGuardianFace(rig, reference.sourceImageSha256), true);
});


test('Build 202 rejected model is denied by native Guardian activation even with every approval boolean true',()=>{
 assert.equal(canActivateArmoredGuardian3D({ ...valid, rigModelSha256: REJECTED_BUILD202_GUARDIAN_MODEL_SHA256 }),false);
 assert.equal(armoredGuardianFacialRig({ ...valid, rigModelSha256: REJECTED_BUILD202_GUARDIAN_MODEL_SHA256 }),null);
});


test('Build 208 private QA-only model cannot activate even with a forged all-true receipt',()=>{
 assert.equal(PRIVATE_BUILD208_QA_ONLY_MODEL_SHA256,'09dcb3cb56b70f5a2b38e5d5f68de627a62df5ad42ad89e2f9d9123d92cf70b5');
 assert.equal(canActivateArmoredGuardian3D({...valid,rigModelSha256:PRIVATE_BUILD208_QA_ONLY_MODEL_SHA256}),false);
 assert.equal(armoredGuardianFacialRig({...valid,rigModelSha256:PRIVATE_BUILD208_QA_ONLY_MODEL_SHA256}),null);
});


test('Build 210 rejects both recovered 198 and reviewed 201 models even when approval booleans are forged',()=>{
 for(const sha of REJECTED_LEGACY_GUARDIAN_MODEL_SHA256){
   assert.equal(canActivateArmoredGuardian3D({...valid,rigModelSha256:sha}),false);
   assert.equal(armoredGuardianFacialRig({...valid,rigModelSha256:sha}),null);
 }
});


test('Build 224 disallows Build 222 candidate activation with any forged all-true receipt',()=>{
 assert.equal(PRIVATE_BUILD222_UNAPPROVED_ARTIST_MODEL_SHA256,'325bc975ccae49db54e5c5ac761a229d7b66930663cb68f5ff5844a507771a36');
 assert.equal(canActivateArmoredGuardian3D({...valid,rigModelSha256:PRIVATE_BUILD222_UNAPPROVED_ARTIST_MODEL_SHA256}),false);
 assert.equal(armoredGuardianFacialRig({...valid,rigModelSha256:PRIVATE_BUILD222_UNAPPROVED_ARTIST_MODEL_SHA256}),null);
});


test('Build 228 visual likeness approval cannot authorize unverified production runtime',()=>{
 assert.equal(PRIVATE_BUILD228_OWNER_VISUAL_APPROVED_DEVICE_PENDING_SHA256,'4d739795c55711a19cd6c4ccb670053697b3ed8e23c2e3648940dac43433540b');
 assert.equal(canActivateArmoredGuardian3D({...valid,rigModelSha256:PRIVATE_BUILD228_OWNER_VISUAL_APPROVED_DEVICE_PENDING_SHA256}),false);
 assert.equal(armoredGuardianFacialRig({...valid,rigModelSha256:PRIVATE_BUILD228_OWNER_VISUAL_APPROVED_DEVICE_PENDING_SHA256}),null);
});

test('Build 227 cannot activate privately revised facial model using an all-true forged receipt',()=>{
 assert.equal(PRIVATE_BUILD227_UNAPPROVED_PROFILE_QA_SHA256,'8168758c8d8b3c448069315b451147f7d655227f8e1963adfc7fac915e595ab3');
 assert.equal(canActivateArmoredGuardian3D({...valid,rigModelSha256:PRIVATE_BUILD227_UNAPPROVED_PROFILE_QA_SHA256}),false);
 assert.equal(armoredGuardianFacialRig({...valid,rigModelSha256:PRIVATE_BUILD227_UNAPPROVED_PROFILE_QA_SHA256}),null);
});

test('Build 226 does not allow a review-only Build 225 avatar to become the final Guardian via forged receipt',()=>{
 assert.equal(PRIVATE_BUILD225_UNAPPROVED_MULTIVIEW_SHA256,'3332367a0085c1c7a873704564aa7decbde906a17a95960eb7eb39805d59228a');
 assert.equal(canActivateArmoredGuardian3D({...valid,rigModelSha256:PRIVATE_BUILD225_UNAPPROVED_MULTIVIEW_SHA256}),false);
 assert.equal(armoredGuardianFacialRig({...valid,rigModelSha256:PRIVATE_BUILD225_UNAPPROVED_MULTIVIEW_SHA256}),null);
});
