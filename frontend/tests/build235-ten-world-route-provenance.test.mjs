import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {REQUIRED_WORLD_ASSETS,assertWorldModelNotReviewOnly} from '../scene-src/approved-world-assets.mjs';
import {REVIEW_ONLY_COLLIDER_WORLD_HASHES,REVIEW_ONLY_BUILD235_TRIANGLE_WORLD_HASHES,REVIEW_ONLY_COLLIDER_WORLD_HASH_SET} from '../scene-src/world-review-only-shas.mjs';

test('Build235 has ten unique exact reviewed world assets, not certified physics passes',async()=>{
 const evidence=JSON.parse(await readFile(new URL('../scene-src/build235-ten-world-triangle-qa.json',import.meta.url),'utf8'));
 assert.equal(evidence.schema,'staarwardd-ten-world-build235-private-triangle-qa-v1');
 assert.equal(evidence.worldCount,10);
 assert.equal(evidence.priorOfflineRoutePassCountUsingExactTriangles,6);
 assert.equal(evidence.revisedPythonTriangleRoutePassCount,10);
 assert.equal(evidence.revisedJavaScriptTriangleRoutePassCount,10);
 assert.deepEqual(Object.keys(evidence.modelHashes).sort(),REQUIRED_WORLD_ASSETS.slice().sort());
 assert.deepEqual(evidence.modelHashes,REVIEW_ONLY_BUILD235_TRIANGLE_WORLD_HASHES);
 assert.equal(new Set(Object.values(evidence.modelHashes)).size,10);
 assert.equal(evidence.geometryBuffersUnchanged,true);
 assert.equal(evidence.singlesIllustrativeTargetShiftM,.75);
 assert.equal(evidence.navigationMetadataModifiedWorldKeys.length,6);
 assert.equal(evidence.release.physicalIphoneCollisionPasses,0);
 assert.equal(evidence.release.founderWorldFinalApprovals,0);
 assert.equal(evidence.release.actualPortalEndpointVerified,false);
 assert.equal(evidence.release.realFloorHeightAndGravityVerified,false);
 assert.equal(evidence.release.rightsVerified,false);
 assert.equal(evidence.release.productionAllowed,false);
 assert.equal(evidence.externalPaidExpenseCAD,0);
});
test('both original and revised private ten-world models stay quarantined regardless of forged receipts',()=>{
 assert.equal(Object.keys(REVIEW_ONLY_COLLIDER_WORLD_HASHES).length,10);
 assert.equal(Object.keys(REVIEW_ONLY_BUILD235_TRIANGLE_WORLD_HASHES).length,10);
 // The original Build214 and Build235 SHA sets remain exactly ten each;
 // Build237 adds ten distinct private floor candidates without unblocking either.
 assert.equal(REVIEW_ONLY_COLLIDER_WORLD_HASH_SET.size,30);
 for(const hash of [...Object.values(REVIEW_ONLY_COLLIDER_WORLD_HASHES),...Object.values(REVIEW_ONLY_BUILD235_TRIANGLE_WORLD_HASHES)]){
   assert.match(hash,/^[a-f0-9]{64}$/);
   assert.equal(REVIEW_ONLY_COLLIDER_WORLD_HASH_SET.has(hash),true);
   assert.throws(()=>assertWorldModelNotReviewOnly(hash),/world_asset_review_only_collider_model/);
 }
});
