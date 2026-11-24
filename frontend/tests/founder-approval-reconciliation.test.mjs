import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {TEN_WORLD_SHA} from '../scene-src/internal-ten-world-qa.mjs';
import {PRIVATE_BUILD228_OWNER_VISUAL_APPROVED_DEVICE_PENDING_SHA256,PRIVATE_BUILD250_CHROME_NECK_REVIEW_SHA256} from '../scene-src/approved-guardian-asset.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const approvals = JSON.parse(fs.readFileSync(path.join(root,'docs/release/founder-approval-reconciliation-2026-11-23.json'),'utf8'));

test('founder creative approvals are retained, without demanding repeat signoff',()=>{
 assert.equal(approvals.founderCreativeApproval.confirmed,true);
 assert.equal(approvals.founderCreativeApproval.requiresRepeatApproval,false);
 assert.equal(approvals.guardian.creativeApprovalRevoked,false);
 assert.equal(approvals.worlds.founderCreativeDirectionAccepted,true);
});

test('historical founder visual hashes match exact quarantined Guardian inputs',()=>{
 assert.equal(approvals.guardian.approvedVisualReference.sha256,PRIVATE_BUILD228_OWNER_VISUAL_APPROVED_DEVICE_PENDING_SHA256);
 assert.equal(approvals.guardian.laterAcceptedReviewModel.sha256,PRIVATE_BUILD250_CHROME_NECK_REVIEW_SHA256);
 assert.equal(approvals.guardian.laterAcceptedReviewModel.rigStructuralChecksPassed,35);
});

test('all ten QA world model hashes are pinned without production promotion',()=>{
 const assetKeys=Object.keys(TEN_WORLD_SHA).sort();
 assert.equal(assetKeys.length,10);
 assert.deepEqual(Object.keys(approvals.worlds.recoveredQaModels).sort(),assetKeys);
 for(const k of assetKeys){
   assert.equal(approvals.worlds.recoveredQaModels[k].sha256,TEN_WORLD_SHA[k]);
   assert.equal(approvals.worlds.recoveredQaModels[k].integrityVerified,true);
   assert.equal(approvals.worlds.recoveredQaModels[k].productionArtCertified,false);
   assert.equal(approvals.worlds.recoveredQaModels[k].realDeviceCertified,false);
   assert.equal(approvals.worlds.recoveredQaModels[k].rightsVerified,false);
 }
});

test('a creative approval can never itself bypass independent production QA gates',()=>{
 assert.equal(approvals.guardian.productionReleaseAllowed,false);
 assert.equal(approvals.guardian.laterAcceptedReviewModel.realIphoneCertified,false);
 assert.equal(approvals.guardian.laterAcceptedReviewModel.exportRightsVerified,false);
 assert.equal(approvals.worlds.finalProductionBinaryAcceptanceCount,0);
 assert.equal(approvals.worlds.productionReleaseAllowed,false);
 assert.equal(approvals.release.blockOnMissingIndependentEvidence,true);
});
