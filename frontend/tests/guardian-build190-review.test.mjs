import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARMORED_SOURCE_SHA256, REAL_FACE_SOURCE_SHA256, REQUIRED_FACE_TARGETS } from '../scene-src/approved-guardian-asset.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(readFileSync(path.join(root,'scene-src/guardian-build190-study.json'),'utf8'));
const sha=v=>typeof v==='string'&&/^[0-9a-f]{64}$/.test(v);

test('approved visual references remain distinct from the owner actual real-face sources',()=>{
 assert.equal(data.schema,'staar-guardian-3d-reconstruction-review-v1');
 assert.equal(data.approvedVisuals.stills.length,3);
 assert.equal(new Set(data.approvedVisuals.stills.map(x=>x.sha256)).size,3);
 assert.ok(data.approvedVisuals.stills.every(x=>sha(x.sha256)));
 assert.equal(data.armorDesignSourceSha256,ARMORED_SOURCE_SHA256);
 assert.equal(data.actualFacialSource.IMG_5711,REAL_FACE_SOURCE_SHA256.primary);
 assert.equal(data.actualFacialSource.IMG_4824,REAL_FACE_SOURCE_SHA256.secondary);
});

test('review study records a 16-morph GLB without making a false final quality claim',()=>{
 assert.equal(data.candidate.filename,'guardian-build190-articulated-study.glb');
 assert.ok(sha(data.candidate.sha256));
 assert.ok(data.candidate.sizeBytes<18*1024*1024);
 assert.equal(data.candidate.meshParts,160);
 assert.ok(data.candidate.triangleCount<100000);
 assert.equal(data.candidate.headJawRig,true);
 assert.deepEqual(data.candidate.namedMorphTargets,REQUIRED_FACE_TARGETS);
 assert.equal(data.candidate.localStructuralChecksPassed,27);
 assert.equal(data.candidate.localStructuralChecksFailed,0);
 assert.equal(data.candidate.technicalAnimationCount,1);
 assert.match(data.candidate.boneAnimationScope,/not approved audio/);
});

test('visual failure and no signed release are explicit, and 3D model is not activated by registry',()=>{
 assert.equal(data.approval.ownerVisualDirectionApproved,true);
 for(const k of ['modelLikenessVerified','armourDesignFidelityVerified','profileReconstructionVerified',
 'allSixteenVisemesDeviceVerified','founderApprovedFinalRig','productionActivationAuthorized'])assert.equal(data.approval[k],false);
 assert.equal(data.externalToolTrial.status,'generated then rejected');
 assert.equal(data.externalToolTrial.additionalCashSpentCAD,0);
 assert.ok(sha(data.preview.turntableSha256)&&sha(data.preview.comparisonSha256));
 const preflight=readFileSync(path.join(root,'scripts/verify-production-package.mjs'),'utf8');
 assert.doesNotMatch(preflight,/guardian-build190-study/);
 const loader=readFileSync(path.join(root,'scene-src/approved-guardian-asset.mjs'),'utf8');
 assert.doesNotMatch(loader,/guardian-build190-study/);
});
