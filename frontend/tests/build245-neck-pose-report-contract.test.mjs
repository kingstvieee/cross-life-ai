import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardianDevicePerformanceProbe} from '../scene-src/guardian-device-performance.js';
import {normalizeIphoneQa} from '../src/iphone-qa-controls.ts';
const SHA='a'.repeat(64);
const CONTEXT={scene:'hub',variant:'realm',session:'privateqa_245',platform:'ios',
 capturedAt:'2026-11-20T19:00:00Z'};
const motion={
 neckPoseBound:true,neckCollarPresent:true,neckPoseSamples:12,neckPoseFailures:0,
 neckMaxPositiveGapUnits:.016,neckMaxVerticalOverlapUnits:.002,
 neckMaxHeadTranslationDriftUnits:0,
 neckQaDecision:'UNVERIFIED',physicalIphoneCertified:false,collarVisualApproved:false
};
test('Build245 local renderer motion telemetry is sanitized and never hardware-certified',()=>{
 const qa=createGuardianDevicePerformanceProbe({maxSamples:400});
 assert.equal(qa.recordNeckPose(motion),false);
 assert.equal(qa.modelReady(SHA),true);
 assert.equal(qa.recordNeckPose({...motion,extraPrivatePixels:'secret'}),true);
 for(let i=0;i<301;i++)qa.recordFrame(i*16.667,9);
 qa.packet({modelSha256:SHA,playheadMs:0,cues:[]},true);
 const data=qa.snapshot();
 assert.equal(data.neckPoseBound,true);
 assert.equal(data.neckPoseSamples,12);
 assert.equal(data.decision,'UNVERIFIED');
 const exportObj=normalizeIphoneQa('guardian',data,CONTEXT);
 assert.equal(exportObj?.result,'REVIEW_REQUIRED');
 assert.equal(exportObj?.certification,'UNVERIFIED');
 assert.equal(exportObj?.physicalIphoneOwnerAttestation,false);
 assert.equal(exportObj?.metrics.neckMaxPositiveGapUnits,.016);
 assert.ok(!JSON.stringify(exportObj).includes('extraPrivatePixels'));
});
test('Build245 blocked model and forged neck QA metrics are refused',()=>{
 const qa=createGuardianDevicePerformanceProbe();
 assert.equal(qa.modelReady(SHA),true);
 for(const bad of [
  {...motion,neckPoseSamples:-1}, {...motion,neckMaxPositiveGapUnits:NaN},
  {...motion,neckMaxPositiveGapUnits:Infinity},
  {...motion,neckMaxPositiveGapUnits:999},
  {...motion,physicalIphoneCertified:true},
  {...motion,collarVisualApproved:true},
  {...motion,neckQaDecision:'CERTIFIED'},
 ])assert.equal(qa.recordNeckPose(bad),false);
 const snap=qa.snapshot();assert.equal(snap.neckPoseSamples,0);
 assert.equal(normalizeIphoneQa('guardian',{...snap,neckPoseBound:true},CONTEXT)?.result,'INSUFFICIENT_SAMPLES');
 assert.equal(normalizeIphoneQa('guardian',{...snap,neckPoseSamples:-4},CONTEXT),null);
 assert.equal(normalizeIphoneQa('guardian',{...snap,neckMaxHeadTranslationDriftUnits:NaN},CONTEXT),null);
 assert.equal(normalizeIphoneQa('guardian',{...snap,neckMaxPositiveGapUnits:1e9},CONTEXT),null);
 assert.equal(normalizeIphoneQa('guardian',{...snap,modelBound:false,modelSha256:null,neckPoseBound:true},CONTEXT),null);
});
test('Build245 report closes cleanly if actual collar never loads',()=>{
 const qa=createGuardianDevicePerformanceProbe();qa.modelReady(SHA);
 const missing={...motion,neckPoseBound:true,neckCollarPresent:false,neckPoseSamples:0};
 assert.equal(qa.recordNeckPose(missing),true);
 const r=normalizeIphoneQa('guardian',qa.snapshot(),CONTEXT);
 assert.equal(r?.metrics.neckPoseSamples,0);
 assert.equal(r?.metrics.neckCollarPresent,false);
 assert.equal(r?.certification,'UNVERIFIED');
});
