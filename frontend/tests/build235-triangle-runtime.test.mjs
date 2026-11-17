import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createTriangleCollisionIndex} from '../scene-src/player-triangle-collision.js';
import {moveCapsuleXZ,routeIsClear,capsuleCollidesXZ} from '../scene-src/player-collision.js';

const wall=[
 [[1,0,-2],[1,2,-2],[1,2,2]],
 [[1,0,-2],[1,2,2],[1,0,2]]
];
test('real height-clipped triangular solids block capsule penetration and swept tunnelling',()=>{
 const index=createTriangleCollisionIndex(wall,{feet:0,height:1.7});
 assert.equal(index.ok,true);
 assert.equal(index.triangleCount,2);
 assert.equal(index.collides({x:0,z:0},.35),false);
 assert.equal(index.collides({x:.70,z:0},.35),true);
 const options={collisionPredicate:p=>index.collides(p,.35),maxDelta:3};
 const result=moveCapsuleXZ({x:0,z:0},{x:2,z:0},[],options);
 assert.equal(result.blocked,true);
 assert.ok(result.point.x<0.70);
 assert.equal(routeIsClear([{x:0,z:0},{x:2,z:0}],[],options),false);
 assert.equal(routeIsClear([{x:0,z:-3},{x:0,z:3}],[],options),true);
});
test('triangle narrow phase avoids bounding-box overblocking empty corners',()=>{
 const slope=[[[0,0,0],[2,0,0],[2,2,2]]];
 const index=createTriangleCollisionIndex(slope,{feet:0,height:1.7});
 assert.equal(index.ok,true);
 // Triangle rises diagonally in both x and z; its AABB spans an unused corner.
 assert.equal(capsuleCollidesXZ({x:.10,z:1.7},[
   {minX:0,maxX:2,minY:0,maxY:2,minZ:0,maxZ:2}
 ]),true);
 assert.equal(index.collides({x:.10,z:1.7},.35),false);
});
test('all unsafe geometry and collision predicate failures are fail-closed',()=>{
 assert.equal(createTriangleCollisionIndex([],{}).ok,false);
 assert.equal(createTriangleCollisionIndex([[[0,0,0],[1,NaN,0],[1,1,1]]]).collides({x:100,z:100}),true);
 assert.equal(createTriangleCollisionIndex([[[0,4,0],[1,4,0],[0,4,1]]],{feet:0,height:1.7}).ok,false);
 const index=createTriangleCollisionIndex(wall,{feet:0,height:1.7});
 assert.equal(index.collides({x:NaN,z:0}),true);
 assert.equal(moveCapsuleXZ({x:0,z:0},{x:1,z:0},[],{collisionPredicate:()=>undefined}).blocked,true);
 assert.equal(moveCapsuleXZ({x:0,z:0},{x:1,z:0},[],{collisionPredicate:()=>{throw Error('bad');}}).blocked,true);
 assert.equal(moveCapsuleXZ({x:0,z:0},{x:1,z:0},[],{collisionPredicate:'not-function'}).blocked,true);
 assert.equal(routeIsClear([{x:0,z:0},{x:1,z:0}],[],{collisionPredicate:'bad'}),false);
});
test('3D runtime uses tagged transformed mesh triangles, new safe controls and real route checks',async()=>{
 const scene=await readFile(new URL('../scene-src/worlds.js',import.meta.url),'utf8');
 assert.match(scene,/staarCollisionRole!=='solid'/);
 assert.match(scene,/applyMatrix4\(node\.matrixWorld\)/);
 assert.match(scene,/createTriangleCollisionIndex\(triangles/);
 assert.match(scene,/collisionPredicate=point=>collisionIndex\.collides/);
 assert.match(scene,/routeIsClear\(transformedRoute,solids/);
 assert.match(scene,/moveCapsuleXZ\(current,/);
 assert.match(scene,/add\('Run','run'/);
 assert.match(scene,/held\.has\('run'\)\?3\.65:1\.65/);
 assert.match(scene,/offlineRouteVerifiedAgainstLoadedTriangles:true/);
 assert.match(scene,/actualPortalEndpointsCertified:false,deviceCertified:false/);
 assert.match(scene,/window\.STAAR_APPROVED_WORLD_ASSETS\?/);
});
