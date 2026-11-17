import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {capsuleCollidesXZ,moveCapsuleXZ,routeIsClear,WALK_RADIUS_M} from '../scene-src/player-collision.js';

const wall=[{minX:1,maxX:1.2,minZ:-2,maxZ:2,minY:0,maxY:2}];
test('Build 215 collision blocks wall penetration, even for high-speed steps',()=>{
 const start={x:0,z:0};
 const result=moveCapsuleXZ(start,{x:2,z:0},wall,{maxDelta:3});
 assert.equal(result.blocked,true);
 assert.ok(result.point.x <= .651);
 assert.equal(result.point.z,0);
 assert.equal(capsuleCollidesXZ({x:.8,z:0},wall),true);
 assert.equal(capsuleCollidesXZ({x:0,z:0},wall),false);
});

test('Build 215 has wall sliding, a continuous capsule radius, finite inputs and vertical filter',()=>{
 const result=moveCapsuleXZ({x:.5,z:-1},{x:.6,z:1},wall,{maxDelta:2});
 assert.equal(result.blocked,true);
 assert.ok(result.point.x<=1-WALK_RADIUS_M+0.001);
 assert.ok(result.point.z>-.6);
 assert.equal(capsuleCollidesXZ({x:1,z:0},[{...wall[0],minY:5,maxY:6}]),false);
 assert.equal(capsuleCollidesXZ({x:0,z:0},[{...wall[0],minX:NaN}]),true);
 assert.equal(moveCapsuleXZ({x:0,z:0},{x:Infinity,z:0},wall).blocked,true);
 assert.equal(moveCapsuleXZ({x:0,z:0},{x:0,z:0},wall).blocked,false);
});

test('Build 215 route probe rejects a crossing that skips over a thin wall',()=>{
 assert.equal(routeIsClear([{x:0,z:0},{x:2,z:0}],wall),false);
 assert.equal(routeIsClear([{x:0,z:-3},{x:0,z:3}],wall),true);
 assert.equal(routeIsClear([{x:0,z:0}],wall),false);
});

test('Build 215 scene uses role-tagged meshes, collision contact, mobile controls and preserves fallback',async()=>{
 const src=await readFile(new URL('../scene-src/worlds.js',import.meta.url),'utf8');
 assert.match(src,/staarCollisionRole!=='solid'/);
 assert.match(src,/new T\.Box3\(\)\.setFromObject\(node\)/);
 assert.match(src,/moveCapsuleXZ\(current,/);
 assert.match(src,/ArrowUp:'forward'/);
 assert.match(src,/add\('↑','forward'/);
 assert.match(src,/enableTaggedWalking\(model,gltf\)/);
 assert.match(src,/addNavigationFallback\(\)/);
 assert.match(src,/deviceCertified:false/);
});
