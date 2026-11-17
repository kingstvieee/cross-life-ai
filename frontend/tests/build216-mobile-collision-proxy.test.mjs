import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateWorldCollisionProxy} from '../scene-src/approved-world-assets.mjs';
import {REVIEW_ONLY_MOBILE_PROXY_HASHES} from '../scene-src/mobile-proxy-review-hashes.mjs';

function proxyFixture(){
 const receipt={modelSha256:'2'.repeat(64),collisionProxySourceWorldSha256:'3'.repeat(64)};
 const gltf={asset:{version:'2.0'},extras:{schema:'staar-build216-private-mobile-proxy-v1',
  worldKey:'home-residence',mobileLodSha256:receipt.modelSha256,
  sourceWorldSha256:receipt.collisionProxySourceWorldSha256,
  colliderCount:1,deviceCertified:false,worldFinalApproved:false},
  buffers:[{byteLength:36}],
  bufferViews:[{buffer:0,byteOffset:0,byteLength:36}],
  accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'}],
  meshes:[{primitives:[{attributes:{POSITION:0}}]}],
  nodes:[{mesh:0,scale:[1,2,1],translation:[1,1,2],extras:{staarCollisionRole:'solid'}}],
  scenes:[{nodes:[0]}],scene:0};
 const src=Buffer.from(JSON.stringify(gltf)),pad=Buffer.alloc((4-src.length%4)%4,32);
 const json=Buffer.concat([src,pad]),out=Buffer.alloc(12+8+json.length+8+36);
 out.write('glTF');out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);
 out.writeUInt32LE(json.length,12);out.write('JSON',16);json.copy(out,20);
 const offset=20+json.length;out.writeUInt32LE(36,offset);
 out.write('BIN',offset+4);out.writeUInt8(0,offset+7);
 receipt.collisionProxySha256=createHash('sha256').update(out).digest('hex');
 return {out,receipt,expected:{id:'home',variant:'residence',key:'home-residence'}};
}
test('Build 216 validates a mobile proxy tied to the exact separate full-world/LOD hashes',()=>{
 const {out,receipt,expected}=proxyFixture();
 const result=validateWorldCollisionProxy(out,receipt,expected);
 assert.equal(result.solidProxyCount,1);
 assert.equal(result.sha256,receipt.collisionProxySha256);
 assert.ok(result.glbBase64.length>100);
 for(const patch of [
   {collisionProxySha256:'4'.repeat(64)},
   {collisionProxySourceWorldSha256:'5'.repeat(64)},
   {modelSha256:'6'.repeat(64)}
 ]) assert.throws(()=>validateWorldCollisionProxy(out,{...receipt,...patch},expected),/world_asset_/);
 assert.throws(()=>validateWorldCollisionProxy(out,receipt,{...expected,key:'style-closet'}),/world_asset_/);
});
test('all six original Build 216 mobile collision proxies remain quarantined until device approval',()=>{
 const entries=Object.entries(REVIEW_ONLY_MOBILE_PROXY_HASHES);
 assert.equal(entries.length,6);
 assert.equal(new Set(entries.map(x=>x[1])).size,6);
 for(const [key,sha] of entries){
  assert.match(key,/^[a-z-]+$/);assert.match(sha,/^[a-f0-9]{64}$/);
 }
});
test('mobile approved-world loader requires collision sidecar and 3D scene has a safe walking fallback',async()=>{
 const importer=await readFile(new URL('../scene-src/approved-world-assets.mjs',import.meta.url),'utf8');
 const scene=await readFile(new URL('../scene-src/worlds.js',import.meta.url),'utf8');
 assert.ok(importer.includes("if(receipt.mobileLod===true)"));
 assert.ok(importer.includes("mobile_lod_missing_collision_proxy_"));
 assert.ok(importer.includes("review_only_mobile_proxy"));
 assert.ok(scene.includes("if(asset.collisionGlbBase64)"));
 assert.ok(scene.includes("enableTaggedWalking(model,gltf,collisionOnly)"));
 assert.ok(scene.includes("updateWalkStatus(false)"));
});
