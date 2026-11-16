import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {REQUIRED_WORLD_ASSETS} from '../scene-src/approved-world-assets.mjs';
import {REQUIRED_FACE_TARGETS} from '../scene-src/approved-guardian-asset.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const d=JSON.parse(readFileSync(path.join(root,'scene-src/build199-master-review-register.json'),'utf8'));
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);

test('Build 199 founder approval is exact model-candidate approval, not a forged physical-device pass',()=>{
 assert.equal(d.schema,'staar-build199-cinematic-candidate-register-v1');
 assert.equal(d.founderApproval.approvedCandidateWorldCount,10);
 assert.equal(d.founderApproval.approvedCandidateGuardianCount,1);
 assert.equal(d.founderApprovedBuild199ReviewDirection,true);
 assert.equal(d.founderApproval.sourceAndMobileModelHashesBound,true);
 assert.equal(d.founderApproval.finalProductionGatesStillRequired,true);
 assert.equal(d.founderApprovedFinal3DMasters,false);
 assert.equal(d.releaseOrTestFlightAllowed,false);
 assert.equal(d.protectedLiveAssetLoaderModified,false);
});

test('ten distinct worlds have exact source and mobile hashes and recorded mobile batching',()=>{
 assert.deepEqual(d.worlds.map(x=>x.key).sort(),[...REQUIRED_WORLD_ASSETS].sort());
 assert.equal(new Set(d.worlds.map(x=>x.sourceSha256)).size,10);
 assert.equal(new Set(d.worlds.map(x=>x.mobileSha256)).size,10);
 assert.ok(d.worlds.every(x=>sha(x.sourceSha256)&&sha(x.mobileSha256)&&x.sourceNodes>x.mobileNodes));
 assert.equal(d.worlds.reduce((s,x)=>s+x.triangles,0),288996);
 assert.equal(d.worlds.reduce((s,x)=>s+x.sourceNodes,0),8717);
 assert.equal(d.worlds.reduce((s,x)=>s+x.mobileNodes,0),263);
 assert.ok(d.worlds.every(x=>x.trianglesPreservedInMobile&&!x.iphoneFpsVerified&&!x.worldCollisionCertified&&!x.rightsAccepted));
});

test('sixteen facial states available technically; no invented voice or likeness attestation',()=>{
 assert.deepEqual(d.guardian.morphTargets,REQUIRED_FACE_TARGETS);
 assert.equal(d.guardian.activeSpeechShapes,14);
 assert.equal(d.guardian.neutralSilenceShapes,2);
 assert.ok(sha(d.guardian.candidateSha256));
 assert.equal(d.guardian.additionalMouthMeshes,3);
 for(const key of ['ownerApproved3DPhotoLikeness','finalGuardianVoiceApproved','truePhonemeAlignmentVerified','realDevicePerformanceAccepted'])
  assert.equal(d.guardian[key],false);
 const preflight=readFileSync(path.join(root,'scripts/verify-production-package.mjs'),'utf8');
 assert.doesNotMatch(preflight,/build199-master-review-register/);
});
