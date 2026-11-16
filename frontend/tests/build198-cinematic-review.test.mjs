import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {REQUIRED_WORLD_ASSETS} from '../scene-src/approved-world-assets.mjs';
import {REQUIRED_FACE_TARGETS} from '../scene-src/approved-guardian-asset.mjs';

const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(readFileSync(path.join(dir,'scene-src/build198-cinematic-review-register.json'),'utf8'));
const validSha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);

test('exactly ten unique world GLBs are registered but none is promoted',()=>{
 assert.equal(data.schema,'staar-build198-private-cinematic-qa-v1');
 assert.equal(data.worldAssets.length,10);
 assert.deepEqual(data.worldAssets.map(w=>w.key).sort(),[...REQUIRED_WORLD_ASSETS].sort());
 assert.equal(new Set(data.worldAssets.map(w=>w.sha256)).size,10);
 assert.ok(data.worldAssets.every(w=>validSha(w.sha256)&&w.meshNodes>=200&&w.triangles>=7000));
 assert.ok(data.worldAssets.every(w=>w.gltfAnimationCount===1&&w.animatedNodes>=4));
 assert.ok(data.worldAssets.every(w=>!w.founderVisualApproved&&!w.navigationDeviceVerified&&!w.rightsEvidenceAccepted));
});
test('real 16 morph target names and synthetic word calibration have explicit non-final boundaries',()=>{
 const g=data.guardian;
 assert.ok(validSha(g.sha256));
 assert.deepEqual(g.namedMorphTargets,REQUIRED_FACE_TARGETS);
 assert.equal(g.namedMorphTargets.length,16);
 assert.equal(g.activeSpeechMorphs,14);
 assert.equal(g.neutralSilenceSlots,2);
 assert.equal(g.skinCount,1);
 assert.equal(g.audioCalibration.durationSeconds,15.934);
 assert.equal(g.audioCalibration.wordCues,16);
 assert.ok(validSha(g.audioCalibration.wavSha256));
 assert.equal(g.audioCalibration.phonemeAccurate,false);
 for(const k of ['headProfileAccepted','threeQuarterLikenessAccepted','founderFinalModelApproved','actualDeviceLipSyncVerified'])assert.equal(g[k],false);
 assert.match(g.audioCalibration.source,/NOT final approved Guardian narration/);
});
test('private models remain outside the protected runtime and app approval gates',()=>{
 assert.equal(data.privateBinaryCommitted,false);
 assert.equal(data.protectedProductionImportsChanged,false);
 assert.equal(data.productionReleaseApproved,false);
 assert.equal(data.evidence.visualApprovalsReceived,0);
 assert.equal(data.evidence.deviceTestsReceived,0);
 assert.equal(data.additionalCashSpentCAD,0);
 const script=readFileSync(path.join(dir,'scripts/verify-production-package.mjs'),'utf8');
 assert.doesNotMatch(script,/build198-cinematic-review-register/);
 const glbLoader=readFileSync(path.join(dir,'scene-src/approved-guardian-asset.mjs'),'utf8');
 assert.doesNotMatch(glbLoader,/build198-cinematic-review-register/);
});
