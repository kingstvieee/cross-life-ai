import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGuardianDevicePerformanceProbe} from '../scene-src/guardian-device-performance.js';
const sha='a'.repeat(64);

test('Build 223 records real renderer-frame intervals but never invents iPhone device acceptance',()=>{
 const qa=createGuardianDevicePerformanceProbe({maxSamples:300});
 for(let t=0;t<1000;t+=16.667)qa.recordFrame(t,7);
 assert.equal(qa.snapshot().modelBound,false);
 assert.equal(qa.modelReady(sha),true);
 for(let i=0;i<120;i++)qa.recordFrame(i*16.667,8);
 const result=qa.snapshot();
 assert.equal(result.modelSha256,sha);
 assert.equal(result.modelBound,true);
 assert.ok(result.observedFps>58&&result.observedFps<62);
 assert.ok(result.frameP95Ms<17);
 assert.equal(result.frameCount,120);
 assert.equal(result.renderFailures,0);
 assert.equal(result.physicalIphoneSessionCertified,false);
 assert.equal(result.externalLipSyncOffsetMeasured,false);
 assert.equal(result.decision,'UNVERIFIED');
});

test('Build 223 records bound viseme packets, fails closed and excludes account/audio pixels',()=>{
 const qa=createGuardianDevicePerformanceProbe();
 assert.equal(qa.modelReady('no'),false);
 qa.modelReady(sha);
 qa.packet({modelSha256:'b'.repeat(64),cues:[]},true);
 qa.packet({modelSha256:sha,playheadMs:130,cues:[
  {atMs:0,viseme:'rest',weight:0},{atMs:100,viseme:'PP',weight:1}]},true);
 qa.packet({modelSha256:sha,playheadMs:270,cues:[
  {atMs:0,viseme:'rest',weight:0},{atMs:250,viseme:'aa',weight:.7}]},false);
 qa.failedFrame();
 const out=qa.snapshot();
 assert.deepEqual(out.observedVisemes,['PP']);
 assert.equal(out.audioPacketCount,2);
 assert.equal(out.acceptedAudioPacketCount,1);
 assert.equal(out.renderFailures,1);
 assert.ok(!JSON.stringify(out).includes('audioBytes'));
 assert.throws(()=>createGuardianDevicePerformanceProbe({maxSamples:10}));
});

test('Build 223 iPhone telemetry is explicitly opt-in, session-bound and shared only by operator',()=>{
 const builder=readFileSync(new URL('../scene-src/build.mjs',import.meta.url),'utf8');
 const scene=readFileSync(new URL('../scene-src/worlds.js',import.meta.url),'utf8');
 const host=readFileSync(new URL('../components/staarwardd/world-scene.tsx',import.meta.url),'utf8');
 assert.match(builder,/window\.STAAR_GUARDIAN_QA/);
 assert.match(builder,/qaMode:boolean=false/);
 assert.match(scene,/window\.STAAR_GUARDIAN_QA === true && world === 'hub'/);
 assert.match(scene,/packet\.session===session && guardianDeviceQa/);
 assert.match(scene,/guardianDeviceQa\.recordFrame/);
 assert.match(scene,/guardianDeviceQa\?\.modelReady/);
 assert.match(host,/EXPO_PUBLIC_GUARDIAN_DEVICE_QA === '1'/);
 assert.match(host,/message\.session !== session/);
 assert.match(host,/Share\.share\(/);
 assert.match(host,/physicalIphoneOwnerAttestation:false/);
 assert.match(host,/realDeviceCertification:'UNVERIFIED'/);
 assert.doesNotMatch(host,/fetch\('https:\/\/.*guardian-device-qa/);
});
