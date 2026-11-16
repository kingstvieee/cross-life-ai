import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REQUIRED_WORLD_ASSETS } from '../scene-src/approved-world-assets.mjs';
import { ARMORED_SOURCE_SHA256, REQUIRED_FACE_TARGETS } from '../scene-src/approved-guardian-asset.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const studies = JSON.parse(readFileSync(path.join(root, 'scene-src/asset-studies-build186.json'), 'utf8'));

test('ten independently hashed studies cover precisely the runtime world variants', () => {
 assert.equal(studies.schema, 'staar-build-186-study-register-v1');
 const expected = [...REQUIRED_WORLD_ASSETS].sort();
 const actual = studies.worldStudies.map(w => w.key).sort();
 assert.deepEqual(actual, expected);
 assert.equal(studies.worldStudies.length, 10);
 assert.equal(new Set(studies.worldStudies.map(w => w.sha256)).size, 10);
 for (const item of studies.worldStudies) {
   assert.match(item.sha256, /^[a-f0-9]{64}$/);
   assert.ok(item.meshCount > 0 && item.triangleCount > 0);
   assert.equal(item.gltfAnimationCount, 1);
   assert.ok(item.animatedNodeCount >= 3 && item.animatedNodeCount <= 5);
   assert.equal(item.founderVisualApproved, false);
   assert.equal(item.deviceCaptureVerified, false);
   assert.equal(item.animationVerified, false);
   assert.equal(item.navigationVerified, false);
   assert.equal(item.exportRightsConfirmed, false);
 }
});
test('identity reference and all sixteen face targets are recorded without false approval', () => {
 assert.equal(studies.guardianStudy.referenceImageSha256, ARMORED_SOURCE_SHA256);
 assert.match(studies.guardianStudy.sha256,/^[a-f0-9]{64}$/);
 assert.equal(studies.guardianStudy.skinCount,1);
 assert.deepEqual(studies.guardianStudy.faceTargetNames, REQUIRED_FACE_TARGETS);
 assert.equal(studies.guardianStudy.founderApprovedRig,false);
 assert.equal(studies.guardianStudy.faceFidelityReviewed,false);
 assert.equal(studies.guardianStudy.armorFidelityReviewed,false);
 assert.equal(studies.guardianStudy.speechSyncDeviceVerified,false);
});
test('study registry cannot masquerade as an approved production delivery', () => {
 assert.equal(studies.releaseApproved,false);
 assert.equal(studies.productionIntegrationAllowed,false);
 assert.ok(studies.downloadablePackages.length===2);
 const productionPreflight = readFileSync(path.join(root,'scripts/verify-production-package.mjs'),'utf8');
 assert.match(productionPreflight,/loadApprovedArmoredGuardianAsset/);
 assert.match(productionPreflight,/loadApprovedWorldAssets/);
 assert.doesNotMatch(productionPreflight,/asset-studies-build186/);
});
