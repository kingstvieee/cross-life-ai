import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {REQUIRED_FACE_TARGETS} from '../scene-src/approved-guardian-asset.mjs';
import {REQUIRED_WORLD_ASSETS} from '../scene-src/approved-world-assets.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const d=JSON.parse(readFileSync(path.join(root,'scene-src/build201-collider-guardian-qa.json'),'utf8'));
const old=JSON.parse(readFileSync(path.join(root,'scene-src/build199-master-review-register.json'),'utf8'));
const checkHash=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);

test('six source and mobile outputs reference distinct actual files and the approved original world names',()=>{
 assert.equal(d.schema,'staar-build201-independent-offline-collider-viseme-qa-v1');
 assert.equal(d.collision.passCount,6);
 assert.equal(d.collision.failedCount,0);
 assert.equal(d.collision.worlds.length,6);
 assert.equal(new Set(d.collision.worlds.map(x=>x.key)).size,6);
 const keys=new Set(REQUIRED_WORLD_ASSETS);
 for(const w of d.collision.worlds){
  assert.ok(keys.has(w.key));
  assert.ok(old.worlds.some(x=>x.key===w.key));
  assert.ok(checkHash(w.sourceSha256)&&checkHash(w.mobileSha256));
  assert.ok(w.routeLengthM>0);
  assert.ok(w.sourceNodeCount>w.mobileNodeCount);
  assert.equal(w.offlineRouteConnected,true);
  assert.equal(w.inAppColliderCertified,false);
  assert.equal(w.founderAcceptedRevisedAsset,false);
 }
});

test('exact two approved stage designs changed only by minimal prop relocation, not wholesale replacement',()=>{
 const moved=d.collision.worlds.filter(x=>x.propRelocation);
 assert.deepEqual(moved.map(x=>x.key).sort(),['relationships-realm','work-command']);
 assert.equal(moved[0].propRelocation.node,'041_Invitation love bench');
 assert.deepEqual(moved[0].propRelocation.deltaM,[0.25,1.5,0]);
 assert.equal(moved[1].propRelocation.node,'374_Command station backlit desktop');
 assert.deepEqual(moved[1].propRelocation.deltaM,[1,1.5,0]);
 assert.ok(d.collision.worlds.every(x=>x.originalMeshAndAnimationBytesPreserved));
});

test('Guardian is a 16-target synthetic speech calibration, not a certified human face or real device result',()=>{
 assert.deepEqual(d.guardian.labels,REQUIRED_FACE_TARGETS);
 assert.ok(checkHash(d.guardian.candidateSha256)&&checkHash(d.guardian.syntheticAudioCalibrationVideoSha256));
 assert.equal(d.guardian.nonzeroSpeechTargetCount,14);
 assert.ok(d.guardian.headMaximumAbsoluteMorphCosineNew<0.99);
 assert.equal(d.guardian.tongueArticulationMeshAdded,true);
 assert.equal(d.guardian.threeOriginalAnimationsPreserved,true);
 for(const k of ['finalOwnerFacialLikenessApproved','authenticProfileScanAvailable','finalVoicePhonemeAligned','physicalDeviceMouthAnimationVerified','productionActivationAllowed'])
  assert.equal(d.guardian[k],false);
});

test('technical offline route and audio tests cannot bypass independent signed release protections',()=>{
 assert.equal(d.privateBinaryCommitted,false);
 assert.equal(d.approvedOriginalAssetReplaced,false);
 assert.equal(d.collision.actualPhysicsEngineIntegrated,false);
 assert.equal(d.collision.iphoneDeviceNavigationTested,false);
 assert.equal(d.collision.illustrativePortalEndpointsVerified,false);
 assert.equal(d.verification.iosNativePerformanceVerified,false);
 assert.equal(d.spendingCAD,0);
 assert.match(d.releaseVerdict,/NO-GO/);
 const preflight=readFileSync(path.join(root,'scripts/verify-production-package.mjs'),'utf8');
 assert.doesNotMatch(preflight,/build201-collider-guardian-qa/);
});
