import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardianDevicePerformanceProbe} from '../scene-src/guardian-device-performance.js';
import {normalizeIphoneQa} from '../src/iphone-qa-controls.ts';
const SHA='b'.repeat(64);
const ctx={scene:'hub',variant:'realm',session:'build246_native_review',
 platform:'ios',capturedAt:'2026-11-20T19:30:00.000Z'};
const neck={neckPoseBound:true,neckCollarPresent:true,neckPoseSamples:25,
 neckPoseFailures:0,neckMaxPositiveGapUnits:.016,
 neckMaxVerticalOverlapUnits:0,neckMaxHeadTranslationDriftUnits:0,
 neckQaDecision:'UNVERIFIED',physicalIphoneCertified:false,
 collarVisualApproved:false};

function loaded(){
 const p=createGuardianDevicePerformanceProbe({maxSamples:500});
 p.modelReady(SHA);
 for(let i=0;i<310;i++)p.recordFrame(i*16.667,8);
 p.packet({modelSha256:SHA,playheadMs:20,cues:[]},true);
 p.recordNeckPose(neck);
 for(let i=0;i<80;i++){
  p.recordMotionMode('walk',true);p.recordMotionMode('run',true);
 }
 return p;
}
test('Build246 requires model, 300 rendered frames, speech and both gait modes plus neck measurements for review',()=>{
 const p=loaded(),raw=p.snapshot(),report=normalizeIphoneQa('guardian',raw,ctx);
 assert.equal(report?.result,'REVIEW_REQUIRED');
 assert.equal(report?.metrics.guardianWalkFrames,80);
 assert.equal(report?.metrics.guardianRunFrames,80);
 assert.equal(report?.metrics.neckPoseSamples,25);
 assert.equal(report?.certification,'UNVERIFIED');
 assert.equal(report?.physicalIphoneOwnerAttestation,false);
});
test('Missing any one evidence dimension cannot reach review-ready',()=>{
 const raw=loaded().snapshot();
 const missing=[
  {frameCount:250},{acceptedAudioPacketCount:0},
  {guardianWalkFrames:0},{guardianRunFrames:0},
  {guardianWalkFrames:59},{guardianRunFrames:59},
  {neckPoseBound:false,neckPoseSamples:0},
  {neckCollarPresent:false},{neckPoseSamples:15},
  {neckPoseFailures:1},
 ];
 for(const delta of missing){
  const r=normalizeIphoneQa('guardian',{...raw,...delta},ctx);
  assert.equal(r?.result,'INSUFFICIENT_SAMPLES',JSON.stringify(delta));
 }
 const absent=normalizeIphoneQa('guardian',{...raw,modelBound:false,modelSha256:null,
  neckPoseBound:false,neckPoseSamples:0},ctx);
 assert.equal(absent?.result,'NO_APPROVED_ASSET');
});
test('State resets when model changes and refuses spoofed modes, unbounded counters and certification',()=>{
 const p=loaded();
 assert.equal(p.recordMotionMode('run',false),false);
 assert.equal(p.recordMotionMode('dancing',true),false);
 assert.equal(p.snapshot().guardianWalkFrames,80);
 p.modelReady('c'.repeat(64));
 const reset=p.snapshot();
 assert.equal(reset.guardianWalkFrames,0);
 assert.equal(reset.guardianRunFrames,0);
 assert.equal(reset.neckPoseSamples,0);
 const raw=loaded().snapshot();
 assert.equal(normalizeIphoneQa('guardian',{...raw,guardianWalkFrames:Infinity},ctx)?.result,'INSUFFICIENT_SAMPLES');
 assert.equal(normalizeIphoneQa('guardian',{...raw,physicalIphoneSessionCertified:true},ctx),null);
 assert.equal(normalizeIphoneQa('guardian',{...raw,neckPoseFailures:-1},ctx),null);
});
