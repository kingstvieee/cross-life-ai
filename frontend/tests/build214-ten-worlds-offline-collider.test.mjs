import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REQUIRED_WORLD_ASSETS, assertWorldModelNotReviewOnly} from '../scene-src/approved-world-assets.mjs';
import {REVIEW_ONLY_COLLIDER_WORLD_HASHES} from '../scene-src/world-review-only-shas.mjs';

const load = name => JSON.parse(readFileSync(new URL('../scene-src/'+name,import.meta.url),'utf8'));
const report = load('build214-ten-world-collider-qa.json');
const original = load('build198-cinematic-review-register.json');
const existing = load('build201-collider-guardian-qa.json');

test('Build 214 integrates all ten unique offline collider candidates and all nine portals plus Singles',()=>{
 assert.equal(report.schema,'staar-build214-offline-ten-world-collider-provenance-v1');
 assert.equal(report.reviewedWorldCount,10);
 assert.equal(report.offlineRoutePassCount,10);
 assert.equal(report.worldResults.length,10);
 const keys=report.worldResults.map(x=>x.key);
 assert.deepEqual(keys.slice().sort(),REQUIRED_WORLD_ASSETS.slice().sort());
 assert.equal(new Set(keys).size,10);
 assert.equal(new Set(report.worldResults.map(x=>x.correctedCandidateSha256)).size,10);
 assert.deepEqual(Object.keys(REVIEW_ONLY_COLLIDER_WORLD_HASHES).sort(),keys.slice().sort());
 for(const entry of report.worldResults){
   assert.match(entry.correctedCandidateSha256,/^[a-f0-9]{64}$/);
   assert.match(entry.sourceSha256,/^[a-f0-9]{64}$/);
   assert.equal(REVIEW_ONLY_COLLIDER_WORLD_HASHES[entry.key],entry.correctedCandidateSha256);
   assert.ok(entry.collisionTaggedMeshCount>200);
   assert.equal(entry.offlineConnectedRoute,true);
   assert.ok(entry.offlineRouteLengthM>=20);
   assert.equal(entry.hasActualPhysicsEvidence,false);
   assert.equal(entry.hasIphoneVideoEvidence,false);
   assert.equal(entry.releaseAccepted,false);
   assert.equal(entry.rightsEvidenceVerified,false);
 }
});

test('four newly collision-annotated worlds preserve exact original owner preview provenance',()=>{
 const updated=report.worldResults.filter(w=>w.newAuthoringVersion===214);
 assert.deepEqual(updated.map(w=>w.key).sort(),[
  'creativity-dream','events-village','relationships-singles','staarverse-universe'
 ]);
 for(const entry of updated){
   const source=original.worldAssets.find(x=>x.key===entry.key);
   assert.ok(source);
   assert.equal(entry.sourceBuild,198);
   assert.equal(entry.sourceSha256,source.sha256);
   assert.equal(source.founderVisualApproved,false);
   assert.equal(source.navigationDeviceVerified,false);
 }
 assert.deepEqual(report.worldResults.filter(w=>w.requestedFixtureAdjusted).map(w=>w.key),['staarverse-universe']);
});

test('other six remain precisely identified as prior collision-reviewed candidates, not certified physics',()=>{
 const six=report.worldResults.filter(w=>w.sourceBuild===201);
 assert.equal(six.length,6);
 assert.equal(existing.collision.passCount,6);
 const prior=new Set(existing.collision.worlds.map(w=>w.key));
 for(const item of six){ assert.ok(prior.has(item.key)); assert.equal(item.newAuthoringVersion,null); }
 assert.equal(existing.collision.actualPhysicsEngineIntegrated,false);
 assert.equal(report.enginePhysicsPassCount,0);
 assert.equal(report.realIphonePassCount,0);
 assert.equal(report.finalOwnerWorldApprovals,0);
});

test('all ten offline collider GLBs reject forged positive production receipts by their real hashes',()=>{
 for(const asset of report.worldResults){
  assert.throws(()=>assertWorldModelNotReviewOnly(asset.correctedCandidateSha256),/world_asset_review_only_collider_model/);
 }
 assert.doesNotThrow(()=>assertWorldModelNotReviewOnly('1'.repeat(64)));
 const source=readFileSync(new URL('../scene-src/approved-world-assets.mjs',import.meta.url),'utf8');
 assert.match(source,/assertWorldModelNotReviewOnly\(digest\)/);
});
