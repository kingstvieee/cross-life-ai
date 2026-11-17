import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  PRIVATE_BUILD229_STATIC_BODY_REVIEW_SHA256,
  PRIVATE_BUILD230_EXPERIMENTAL_BODY_RIG_SHA256,
  assertGuardianModelNotRejected
} from '../scene-src/approved-guardian-asset.mjs';
import {
  LOCKED_ARMORED_GUARDIAN,
  canActivateArmoredGuardian3D,
  armoredGuardianFacialRig
} from '../src/guardian-armor-lock.ts';

const build229='84295da28d4b580f83cad8786cf684ea498c45d5185c85a7d09955b9c6b5f5b4';
const build230='656a12b79a334e6d0a4301b666df5098f0ab6ae1387a5195904b978fc5415130';

test('Build 229 and experimental 230 hashes are pinned independently, but never release-accepted',()=>{
  assert.equal(PRIVATE_BUILD229_STATIC_BODY_REVIEW_SHA256,build229);
  assert.equal(PRIVATE_BUILD230_EXPERIMENTAL_BODY_RIG_SHA256,build230);
  assert.throws(()=>assertGuardianModelNotRejected(build229),/guardian_rig_build229_unrigged_body_not_approved/);
  assert.throws(()=>assertGuardianModelNotRejected(build230),/guardian_rig_build230_experimental_rig_not_approved/);
});

test('Neither Build 229 nor Build 230 can be activated with fake all-true owner receipt flags',()=>{
  const allTrue={
    sourceImageSha256:LOCKED_ARMORED_GUARDIAN.sourceImageSha256,
    identityAssetId:'signed-owner-only-model',
    founderApprovedRig:true,faceFidelityReviewed:true,armorFidelityReviewed:true,
    frontThreeQuarterProfileReviewed:true,speechSyncDeviceVerified:true,
    blendshapeTargets:['rest','sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U']
  };
  for(const rigModelSha256 of [build229,build230]){
    const candidate={...allTrue,rigModelSha256};
    assert.equal(canActivateArmoredGuardian3D(candidate),false);
    assert.equal(armoredGuardianFacialRig(candidate),null);
  }
});

test('Build 228 face-only founder approval is retained without false Apple/device proof',async()=>{
  const data=JSON.parse(await readFile(new URL('../scene-src/build228-founder-visual-review.json',import.meta.url),'utf8'));
  assert.equal(data.modelSha256,'4d739795c55711a19cd6c4ccb670053697b3ed8e23c2e3648940dac43433540b');
  assert.equal(data.visualAcceptance.founderApprovedVisualLikeness,true);
  assert.equal(data.productionReleaseAllowed,false);
  assert.equal(data.productionEvidence.signedAppleIPAProduced,false);
});
