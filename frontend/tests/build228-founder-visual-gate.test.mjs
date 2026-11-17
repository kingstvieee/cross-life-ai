import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  PRIVATE_BUILD228_OWNER_VISUAL_APPROVED_DEVICE_PENDING_SHA256,
  assertGuardianModelNotRejected
} from '../scene-src/approved-guardian-asset.mjs';

const EXPECTED_SHA = '4d739795c55711a19cd6c4ccb670053697b3ed8e23c2e3648940dac43433540b';

test('Build 228 logs exact binary visual founder approval without manufacturing Apple evidence', async () => {
  const approval = JSON.parse(await readFile(new URL('../scene-src/build228-founder-visual-review.json', import.meta.url), 'utf8'));
  assert.equal(approval.schema, 'staarwardd-guardian-build228-founder-visual-review-v1');
  assert.equal(approval.modelSha256, EXPECTED_SHA);
  assert.equal(approval.modelBytes, 4853728);
  assert.equal(approval.visualAcceptance.founderApprovedVisualLikeness, true);
  assert.equal(approval.visualAcceptance.formalCryptographicSignatureProvided, false);
  assert.equal(approval.productionEvidence.realIphoneSpeechSyncVerified, false);
  assert.equal(approval.productionEvidence.realIphoneWatchAccepted, false);
  assert.equal(approval.productionEvidence.signedAppleIPAProduced, false);
  assert.equal(approval.productionEvidence.appStoreConnectSubmissionReceiptVerified, false);
  assert.equal(approval.productionReleaseAllowed, false);
});

test('Founder visual approval never unlocks the unverified Build 228 model importer', () => {
  assert.equal(PRIVATE_BUILD228_OWNER_VISUAL_APPROVED_DEVICE_PENDING_SHA256, EXPECTED_SHA);
  assert.throws(
    () => assertGuardianModelNotRejected(EXPECTED_SHA),
    /guardian_rig_build228_release_requirements_pending/,
  );
});
