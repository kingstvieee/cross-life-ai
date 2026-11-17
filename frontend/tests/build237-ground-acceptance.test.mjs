import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createGroundSupportIndex} from '../scene-src/player-ground-support.js';
import {REVIEW_ONLY_BUILD237_FLOOR_WORLD_HASHES,REVIEW_ONLY_COLLIDER_WORLD_HASH_SET} from '../scene-src/world-review-only-shas.mjs';
import {assertWorldModelNotReviewOnly,REQUIRED_WORLD_ASSETS} from '../scene-src/approved-world-assets.mjs';

const plane=[
 [[-3,-.14,-3],[3,-.14,-3],[3,-.14,3]],
 [[-3,-.14,-3],[3,-.14,3],[-3,-.14,3]],
];
test('Build237 actual-triangle floor support rejects gaps, invalid rays and routes leaving floor',()=>{
 const index=createGroundSupportIndex(plane);
 assert.equal(index.ok,true);
 const support=index.supportAt({x:0,z:0},{feet:0});
 assert.equal(support.supported,true);
 assert.ok(Math.abs(support.height+.14)<1e-6);
 assert.equal(index.supportAt({x:7,z:0},{feet:0}).supported,false);
 assert.equal(index.routeSupported([{x:-2,z:0},{x:2,z:0}],{feet:0}),true);
 assert.equal(index.routeSupported([{x:-2,z:0},{x:6,z:0}],{feet:0}),false);
 assert.equal(index.supportAt({x:0,z:0},{feet:2,maxDrop:.4}).supported,false);
});
test('Build237 cliff, non-finite geometry and vertical walls never certify floors',()=>{
 const wall=[[[1,0,0],[1,2,0],[1,2,2]]];
 assert.equal(createGroundSupportIndex(wall).ok,false);
 assert.equal(createGroundSupportIndex([]).ok,false);
 assert.equal(createGroundSupportIndex([[[0,0,0],[1,NaN,0],[0,0,1]]]).ok,false);
 const tiny=[[[0,-.1,0],[.2,-.1,0],[.2,-.1,.2]]];
 const index=createGroundSupportIndex(tiny);
 assert.equal(index.ok,true);
 assert.equal(index.supportAt({x:.1,z:.1},{feet:0,radius:.4}).supported,false);
});
test('Build237 ten exact private floor-candidate assets cannot be silently approved',async()=>{
 const report=JSON.parse(await readFile(new URL('../scene-src/build237-private-floor-review.json',import.meta.url),'utf8'));
 assert.equal(report.schema,'staar-build237-floor-candidate-review-v1');
 assert.equal(report.worldCount,10);
 assert.equal(report.offlineRayCoverageWorldCount,10);
 assert.equal(report.realIphoneFloorPassCount,0);
 assert.equal(report.worldPhysicsAcceptedCount,0);
 assert.equal(report.releaseAllowed,false);
 assert.equal(Object.keys(REVIEW_ONLY_BUILD237_FLOOR_WORLD_HASHES).length,10);
 assert.deepEqual(Object.keys(REVIEW_ONLY_BUILD237_FLOOR_WORLD_HASHES).sort(),REQUIRED_WORLD_ASSETS.slice().sort());
 for(const sha of Object.values(REVIEW_ONLY_BUILD237_FLOOR_WORLD_HASHES)){
  assert.equal(REVIEW_ONLY_COLLIDER_WORLD_HASH_SET.has(sha),true);
  assert.throws(()=>assertWorldModelNotReviewOnly(sha),/world_asset_review_only_collider_model/);
 }
 for(const item of report.worlds){
  assert.equal(REVIEW_ONLY_BUILD237_FLOOR_WORLD_HASHES[item.world],item.sha256);
  assert.equal(item.sourceGeometryUnmodified,true);
  assert.equal(item.floorRole,'walkable_candidate');
  assert.equal(item.physicalIphoneApproved,false);
 }
});
test('World renderer demands explicit walkable surface and blocks unsurveyed visual floors',async()=>{
 const scene=await readFile(new URL('../scene-src/worlds.js',import.meta.url),'utf8');
 assert.match(scene,/role!=='solid'&&role!=='walkable'/);
 assert.match(scene,/groundTriangles\.length/);
 assert.match(scene,/createGroundSupportIndex\(groundTriangles\)/);
 assert.match(scene,/groundIndex\.routeSupported/);
 assert.match(scene,/groundGapGuardActive:true/);
 assert.match(scene,/walkable_candidate/);
 assert.match(scene,/deviceCertified:false/);
});
