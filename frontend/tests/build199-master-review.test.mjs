import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {REQUIRED_WORLD_ASSETS} from '../scene-src/approved-world-assets.mjs';
import {REQUIRED_FACE_TARGETS} from '../scene-src/approved-guardian-asset.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(readFileSync(path.join(root,'scene-src/build199-master-review-register.json'),'utf8'));
const isHash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);

test('ten distinct real 3D world candidates and mobile variants are independently SHA-pinned',()=>{
 assert.equal(data.schema,'staar-build199-cinematic-candidate-register-v1');
 assert.equal(data.worlds.length,10);
 assert.deepEqual(data.worlds.map(x=>x.key).sort(),[...REQUIRED_WORLD_ASSETS].sort());
 assert.equal(new Set(data.worlds.map(x=>x.sourceSha256)).size,10);
 assert.equal(new Set(data.worlds.map(x=>x.mobileSha256)).size,10);
 assert.ok(data.worlds.every(x=>isHash(x.sourceSha256)&&isHash(x.mobileSha256)&&x.triangles>10000));
 assert.ok(data.worlds.every(x=>x.animationDurationSeconds===6&&x.trianglesPreservedInMobile));
});
test('source and mobile scene metrics are internally coherent without claiming device FPS',()=>{
 assert.equal(data.technical.sourceWorldNodes,data.worlds.reduce((sum,x)=>sum+x.sourceNodes,0));
 assert.equal(data.technical.mobileWorldNodes,data.worlds.reduce((sum,x)=>sum+x.mobileNodes,0));
 assert.equal(data.technical.sourceWorldTriangles,data.worlds.reduce((sum,x)=>sum+x.triangles,0));
 assert.ok(data.technical.sourceWorldNodes>8500);
 assert.ok(data.technical.mobileWorldNodes<300);
 assert.equal(data.technical.verifiedBufferViewsAndModelRules,9870);
 for(const x of data.worlds){
  assert.equal(x.founderFinalArtApproved,false);
  assert.equal(x.iphoneFpsVerified,false);
  assert.equal(x.worldCollisionCertified,false);
  assert.equal(x.rightsAccepted,false);
 }
});
test('synthetic 16-target Guardian retains final likeness and voice approval gates',()=>{
 const g=data.guardian;
 assert.ok(isHash(g.candidateSha256)&&isHash(g.reviewMovieSha256));
 assert.deepEqual(g.morphTargets,REQUIRED_FACE_TARGETS);
 assert.equal(g.morphTargets.length,16);
 assert.equal(g.additionalMouthMeshes,3);
 assert.equal(g.activeSpeechShapes,14);
 assert.equal(g.neutralSilenceShapes,2);
 assert.equal(g.animationClips,3);
 assert.equal(g.pcmSyntheticSpeechSeconds,15.934);
 for(const k of ['ownerApproved3DPhotoLikeness','finalGuardianVoiceApproved','truePhonemeAlignmentVerified','realDevicePerformanceAccepted'])assert.equal(g[k],false);
});
test('nothing in the review register can quietly unlock the protected scene loader or release',()=>{
 assert.equal(data.approvedCinematicConceptDirection,true);
 assert.equal(data.founderApprovedFinal3DMasters,false);
 assert.equal(data.protectedLiveAssetLoaderModified,false);
 assert.equal(data.releaseOrTestFlightAllowed,false);
 assert.equal(data.delivery.privateBinaryInPublicRepository,false);
 assert.equal(data.cashSpentCAD,0);
 assert.doesNotMatch(readFileSync(path.join(root,'scripts/verify-production-package.mjs'),'utf8'),/build199-master-review-register/);
 assert.doesNotMatch(readFileSync(path.join(root,'scene-src/approved-guardian-asset.mjs'),'utf8'),/build199-master-review-register/);
});
