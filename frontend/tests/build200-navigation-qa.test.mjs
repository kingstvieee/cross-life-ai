import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const baseline=JSON.parse(readFileSync(path.join(root,'scene-src/build199-master-review-register.json'),'utf8'));
const nav=JSON.parse(readFileSync(path.join(root,'scene-src/build200-navigation-qa-register.json'),'utf8'));

test('all 10 proxy observations are linked to the owner-approved exact source and mobile model hashes',()=>{
 assert.equal(nav.schema,'staar-build200-aabb-navigation-qa-v1');
 assert.equal(nav.results.length,10);
 const set=new Map(baseline.worlds.map(w=>[w.key,w]));
 assert.equal(set.size,10);
 assert.deepEqual(nav.results.map(w=>w.worldKey).sort(),[...set.keys()].sort());
 for(const w of nav.results){
  const original=set.get(w.worldKey);
  assert.equal(w.sourceSha256,original.sourceSha256);
  assert.equal(w.mobileSha256,original.mobileSha256);
  assert.equal(w.founderApprovedCandidateBaseline,true);
  assert.equal(w.finalMasterProductionAccepted,false);
 }
});

test('proxy reports 4 connected and 6 blocked routes without fabricating a real navigation certification',()=>{
 assert.equal(nav.status.modelsExamined,10);
 assert.equal(nav.status.proxyConnectedCount,4);
 assert.equal(nav.status.proxyBlockedCount,6);
 assert.equal(nav.results.filter(x=>x.connectedByProxy).length,4);
 assert.equal(nav.results.filter(x=>!x.connectedByProxy).length,6);
 assert.ok(nav.results.filter(x=>x.connectedByProxy).every(x=>x.routeLengthM>0));
 assert.ok(nav.results.filter(x=>!x.connectedByProxy).every(x=>x.routeLengthM===null));
 assert.ok(nav.results.every(x=>!x.actualAppCollisionQA&&!x.verifiedSpawnAndPortal&&!x.iphoneFrameRateQA));
 assert.equal(nav.status.realDeviceNavigationPassedCount,0);
 assert.equal(nav.status.productionGLBsPromoted,0);
 assert.equal(nav.mobileFileSizeAudit.sourceBytesTotal,6534576);
 assert.equal(nav.mobileFileSizeAudit.mobileBytesTotal,5475852);
 assert.equal(nav.results.filter(x=>x.mobileSizeAudit.mobileLargerThanSource).length,1);
 assert.deepEqual(nav.mobileFileSizeAudit.largerThanSourceWorlds,['creativity-dream']);
 assert.equal(nav.mobileFileSizeAudit.bytesAreNotRuntimeRamBenchmark,true);

});

test('AABB geometry proxy cannot unlock iPhone signing or final Guardian performance',()=>{
 assert.equal(nav.assumptions.endpointsFromActualPortalRuntime,false);
 assert.match(nav.assumptions.scope,/NOT a final navmesh/);
 assert.equal(nav.protectedReleaseState.tenWorldPhysicsVerified,false);
 assert.equal(nav.protectedReleaseState.tenWorldRuntimeFpsVerified,false);
 assert.equal(nav.protectedReleaseState.guardian16PhonemeAccuracyVerified,false);
 assert.equal(nav.protectedReleaseState.finalGuardianRealFaceIdentityVerified,false);
 assert.equal(nav.protectedReleaseState.testflightReleaseAuthorized,false);
 const code=readFileSync(path.join(root,'scripts/verify-production-package.mjs'),'utf8');
 assert.doesNotMatch(code,/build200-navigation-qa-register/);
});