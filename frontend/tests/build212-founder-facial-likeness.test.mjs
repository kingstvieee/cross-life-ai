import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const load = name => JSON.parse(readFileSync(new URL('../scene-src/'+name,import.meta.url),'utf8'));

test('owner explicitly accepted final Guardian facial likeness direction; approval must not silently bind a GLB',()=>{
 const current=load('build212-founder-facial-likeness-acceptance.json');
 const prior=load('build202-cinematic-reference-approval.json');
 assert.equal(current.schema,'staar-guardian-build212-founder-facial-likeness-direction-approval-v1');
 assert.equal(current.ownerStatement,'Final Guardian facial likeness accepted');
 assert.equal(current.approval.finalFacialLikenessArtDirectionAccepted,true);
 assert.equal(current.approval.originalLockedArmoredGuardianDesignPreserved,true);
 assert.equal(current.approval.ownerAcceptedSpecificGLBHash,null);
 assert.equal(current.approval.ownerAcceptedProduction3DModel,false);
 assert.equal(current.approval.identityAndProfileCalibrationDeviceVerified,false);
 assert.equal(current.approval.speechSyncDeviceVerified,false);
 assert.equal(current.approval.appleSigningOrTestFlightAuthorizedByThisStatement,false);
 const expected=prior.approvedCreativeReferences
  .filter(x=>['front','three-quarter','right-profile'].includes(x.view))
  .map(({view,sha256})=>({view,sha256}));
 assert.deepEqual(current.approval.acceptedReferenceSHA256,expected);
});

test('recording likeness direction does not unblock rejected Guardian GLBs or owner-bound release evidence',()=>{
 const current=load('build212-founder-facial-likeness-acceptance.json');
 assert.equal(current.excludedHistoricGLBs.length,4);
 const hashes=current.excludedHistoricGLBs.map(x=>x.sha256);
 assert.equal(new Set(hashes).size,4);
 for(const sha of hashes)assert.match(sha,/^[a-f0-9]{64}$/);
 const importer=readFileSync(new URL('../scene-src/approved-guardian-asset.mjs',import.meta.url),'utf8');
 const native=readFileSync(new URL('../src/guardian-armor-lock.ts',import.meta.url),'utf8');
 assert.match(importer,/REJECTED_LEGACY_GUARDIAN_MODEL_SHA256/);
 assert.match(importer,/REJECTED_BUILD202_GUARDIAN_MODEL_SHA256/);
 assert.match(importer,/PRIVATE_BUILD208_QA_ONLY_MODEL_SHA256/);
 assert.match(native,/REJECTED_LEGACY_GUARDIAN_MODEL_SHA256/);
 assert.match(native,/PRIVATE_BUILD208_QA_ONLY_MODEL_SHA256/);
 const evidence=readFileSync(new URL('../scripts/verify-release-evidence.mjs',import.meta.url),'utf8');
 assert.match(evidence,/item\.modelSha256!==expected\.get\(key\)/);
 assert.match(evidence,/founderAcceptance\.decision!=='accepted'/);
});
