/** Synthetic geometry fixtures, NOT final ten-world native physics acceptance. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createTriangleCollisionIndex} from '../scene-src/player-triangle-collision.js';
import {createGroundSupportIndex} from '../scene-src/player-ground-support.js';
import {moveCapsuleXZ,routeIsClear} from '../scene-src/player-collision.js';
import {REQUIRED_WORLD_ASSETS,assertWorldModelNotReviewOnly} from '../scene-src/approved-world-assets.mjs';
import {REVIEW_ONLY_BUILD237_FLOOR_WORLD_HASHES} from '../scene-src/world-review-only-shas.mjs';
const plane=(left,right,zmin=-5,zmax=5,y=-.14)=>[
 [[left,y,zmin],[right,y,zmin],[right,y,zmax]],
 [[left,y,zmin],[right,y,zmax],[left,y,zmax]]
];
const wall=(x,zmin=-2,zmax=2)=>[
 [[x,0,zmin],[x,2,zmin],[x,2,zmax]],
 [[x,0,zmin],[x,2,zmax],[x,0,zmax]],
];
function fixture(i){
 const wallX=1+i*.08;
 const collision=createTriangleCollisionIndex(wall(wallX),{feet:0,height:1.7});
 const ground=createGroundSupportIndex(plane(-5,5));
 assert.equal(collision.ok,true);assert.equal(ground.ok,true);
 const q={feet:0,maxDrop:.3,maxRise:.18,radius:.245};
 const predicate=p=>collision.collides(p,.35)||!ground.supportAt(p,q).supported;
 return {wallX,collision,ground,opts:{collisionPredicate:predicate,maxDelta:3}};
}
test('Build240 canonical ten-world synthetic test matrix: corridor walk, wall stop, sprint no-tunnel, edge support and path proof',()=>{
 assert.equal(REQUIRED_WORLD_ASSETS.length,10);
 for(const [i,key] of REQUIRED_WORLD_ASSETS.entries()){
  const {wallX,collision,ground,opts}=fixture(i);
  assert.equal(collision.triangleCount,2,key);
  assert.equal(ground.triangleCount,2,key);
  assert.equal(collision.collides({x:0,z:0},.35),false,key);
  assert.equal(ground.supportAt({x:0,z:0},{feet:0}).supported,true,key);
  const crossed=moveCapsuleXZ({x:0,z:0},{x:wallX+1,z:0},[],opts);
  assert.equal(crossed.blocked,true,key);
  assert.ok(crossed.point.x<=wallX-.35+.02,key);
  assert.equal(routeIsClear([{x:0,z:0},{x:wallX+1,z:0}],[],opts),false,key);
  assert.equal(routeIsClear([{x:0,z:-3},{x:0,z:3}],[],opts),true,key);
  assert.equal(ground.supportAt({x:4.98,z:0},{feet:0,radius:.35}).supported,false,key);
  // Advance repeated run-speed-sized frames; traversal must never tunnel.
  let p={x:0,z:0},blocked=false;
  for(let step=0;step<35;step++){
   const m=moveCapsuleXZ(p,{x:.075*3.65,z:0},[],opts);
   p=m.point;blocked ||= m.blocked;
  }
  assert.equal(blocked,true,key);
  assert.ok(p.x<wallX-.34,key);
  assert.throws(()=>assertWorldModelNotReviewOnly(REVIEW_ONLY_BUILD237_FLOOR_WORLD_HASHES[key]),
   /review_only/,key);
 }
});
test('Build240 synthetic missing-floor gap cannot count as a walkable bridge or route',()=>{
 const ground=createGroundSupportIndex([...plane(-5,-.5),...plane(.5,5)]);
 assert.equal(ground.ok,true);
 assert.equal(ground.supportAt({x:-2,z:0},{feet:0}).supported,true);
 assert.equal(ground.supportAt({x:0,z:0},{feet:0}).supported,false);
 assert.equal(ground.routeSupported([{x:-2,z:0},{x:2,z:0}],{feet:0}),false);
});
test('Build240 invalid triangle model or route is fail-closed and never grants device approval',()=>{
 const invalid=createTriangleCollisionIndex([[[0,0,0],[0,Infinity,0],[0,2,2]]]);
 assert.equal(invalid.ok,false);
 assert.equal(invalid.collides({x:100,z:100}),true);
 const ground=createGroundSupportIndex([[[0,0,0],[1,NaN,0],[1,0,1]]]);
 assert.equal(ground.ok,false);
 assert.equal(ground.supportAt({x:0,z:0}).supported,false);
});
