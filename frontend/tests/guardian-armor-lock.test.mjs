import test from 'node:test';
import assert from 'node:assert/strict';
import { GUARDIAN_VISEMES, mayAnimateApprovedGuardianFace } from '../src/guardian-visemes.ts';
import { LOCKED_ARMORED_GUARDIAN, REJECTED_BUILD202_GUARDIAN_MODEL_SHA256, canActivateArmoredGuardian3D, armoredGuardianFacialRig } from '../src/guardian-armor-lock.ts';

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
