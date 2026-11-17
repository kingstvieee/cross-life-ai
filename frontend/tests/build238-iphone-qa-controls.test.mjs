import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeIphoneQa,iphoneQaStatus} from '../src/iphone-qa-controls.ts';
import {WORLD_QA_KEYS,worldQaKey,readWorldQaArchive,saveWorldQaCapture,worldQaProgress,exportWorldQaArchive,clearWorldQaArchive,WORLD_QA_STORAGE_KEY} from '../src/iphone-qa-archive.ts';

const ctx={scene:'hub',variant:'realm',session:'2026_abc_1',platform:'ios',capturedAt:'2026-11-17T14:15:00.000Z'};
const hash='a'.repeat(64);
const guardian=()=>({
 schema:'staar-guardian-physical-device-qa-telemetry-v1',
 modelBound:true,modelSha256:hash,frameCount:620,sampledFrameIntervals:619,
 frameP95Ms:16.6,observedFps:59.4,renderFailures:0,audioPacketCount:44,
 acceptedAudioPacketCount:42,observedVisemes:['PP','aa'],
 decision:'UNVERIFIED',physicalIphoneSessionCertified:false,
 externalLipSyncOffsetMeasured:false,finalLikenessApproved:false,
 });
const world=(scene,variant)=>({
 schema:'staar-world-physical-device-qa-telemetry-v1',
 worldKey:scene+'-'+variant,modelSha256:hash,frameCount:650,intervalCount:649,
 frameIntervalP95Ms:16.8,steps:120,blockedSteps:12,walkSteps:80,runSteps:40,
 distanceMeters:15.44,groundTriangles:250,collisionTriangles:890,
 routePreflightPassed:true,webglContextLost:false,
 actualPortalEndpointsCertified:false,physicsEngineCertified:false,
 realIphoneCertified:false,finalWorldOwnerApproved:false,decision:'UNVERIFIED',
 });
test('Build238 strips untrusted renderer data, preserves session and never self-certifies',()=>{
 const input={...guardian(),accessToken:'DO_NOT_EXPORT',audioBytes:'PRIVATE',modelApproved:true};
 const normalized=normalizeIphoneQa('guardian',input,ctx);
 assert.equal(normalized?.schema,'staar-iphone-build238-local-qa-export-v1');
 assert.equal(normalized?.session,ctx.session);
 assert.equal(normalized?.certification,'UNVERIFIED');
 assert.equal(normalized?.physicalIphoneOwnerAttestation,false);
 assert.equal(normalized?.result,'REVIEW_REQUIRED');
 assert.equal(normalized?.metrics.modelSha256,hash);
 assert.ok(!JSON.stringify(normalized).includes('accessToken'));
 assert.ok(!JSON.stringify(normalized).includes('audioBytes'));
 assert.match(iphoneQaStatus(normalized),/not certified/);
});
test('Build238 does not accept renderer claims of device certification or invalid metrics',()=>{
 assert.equal(normalizeIphoneQa('guardian',{...guardian(),physicalIphoneSessionCertified:true},ctx),null);
 assert.equal(normalizeIphoneQa('guardian',{...guardian(),decision:'PASS'},ctx),null);
 assert.equal(normalizeIphoneQa('guardian',{...guardian(),frameP95Ms:-1},ctx)?.metrics.frameP95Ms,undefined);
 assert.equal(normalizeIphoneQa('guardian',{...guardian(),modelSha256:'not-sha'},ctx),null);
 assert.equal(normalizeIphoneQa('guardian',{...guardian(),acceptedAudioPacketCount:1000},ctx),null);
 assert.equal(normalizeIphoneQa('guardian',guardian(),{...ctx,session:'../escape'}),null);
 assert.equal(normalizeIphoneQa('guardian',{...guardian(),modelBound:false,modelSha256:null,frameCount:0,
   audioPacketCount:0,acceptedAudioPacketCount:0},ctx)?.result,'NO_APPROVED_ASSET');
 assert.equal(normalizeIphoneQa('world',{...world('home','realm'),realIphoneCertified:true},
   {...ctx,scene:'home'}),null);
 assert.equal(normalizeIphoneQa('world',{...world('home','realm'),worldKey:'work-realm'},
   {...ctx,scene:'home'}),null);
});
test('Build238 correctly flags a missing production asset; a capture is never a world acceptance',()=>{
 const missing={schema:'staar-world-physical-device-qa-telemetry-v1',
  worldKey:'home',reason:'no_verified_world_model',decision:'UNVERIFIED'};
 const report=normalizeIphoneQa('world',missing,{...ctx,scene:'home'});
 assert.equal(report?.result,'NO_APPROVED_ASSET');
 assert.equal(report?.metrics.modelBound,false);
 assert.equal(report?.certification,'UNVERIFIED');
 const normal=normalizeIphoneQa('world',world('home','realm'),{...ctx,scene:'home'});
 assert.equal(normal?.result,'REVIEW_REQUIRED');
 assert.equal(normal?.physicalIphoneOwnerAttestation,false);
 assert.equal(worldQaKey('relationships','singles'),'relationships-singles');
 assert.equal(worldQaKey('relationships','realm'),'relationships-realm');
 assert.equal(worldQaKey('unknown','realm'),null);
});
test('Build238 archives exactly ten separate private diagnostics and exports unverified only',async()=>{
 const data=new Map();
 const store={
  async getItem(k){return data.get(k)??null;},
  async setItem(k,v){data.set(k,v);},
  async removeItem(k){data.delete(k);},
 };
 const scenes=[
 ['home','realm'],['work','realm'],['creativity','realm'],
 ['wellbeing','realm'],['relationships','realm'],['relationships','singles'],
 ['events','realm'],['style','realm'],['staarverse','realm'],['staarsonic','realm'],
 ];
 for(const [scene,variant]of scenes){
  const report=normalizeIphoneQa('world',world(scene,variant),{...ctx,scene,variant});
  assert.ok(report);
  await saveWorldQaCapture(store,report);
 }
 const archive=await readWorldQaArchive(store);
 assert.equal(data.has(WORLD_QA_STORAGE_KEY),true);
 const progress=worldQaProgress(archive);
 assert.equal(progress.captured,10);
 assert.equal(progress.total,10);
 assert.equal(progress.withModel,10);
 assert.deepEqual(progress.missing,[]);
 assert.equal(Object.keys(archive.worlds).length,10);
 assert.equal(WORLD_QA_KEYS.length,10);
 const exported=JSON.parse(exportWorldQaArchive(archive,ctx.capturedAt));
 assert.equal(exported.diagnosticsCaptured,10);
 assert.equal(exported.finalWorldsApproved,0);
 assert.equal(exported.physicalIphoneCertification,'UNVERIFIED');
 assert.equal(exported.deviceOwnerAttestation,false);
 assert.ok(Object.values(exported.results).every(v=>v.certification==='UNVERIFIED'));
 await clearWorldQaArchive(store);
 assert.equal(worldQaProgress(await readWorldQaArchive(store)).captured,0);
});
test('Build238 malformed persisted data cannot become approval or cross-world content',async()=>{
 let contents=JSON.stringify({
  schema:'staar-iphone-build238-world-archive-v1',
  worlds:{'home-residence':{schema:'staar-iphone-build238-local-qa-export-v1',kind:'world',
    certification:'ACCEPTED',physicalIphoneOwnerAttestation:true,scene:'home',variant:'realm',
    metrics:{modelBound:true}}},
 });
 const store={
  async getItem(){return contents;},
  async setItem(k,v){contents=v;},
  async removeItem(){contents='';},
 };
 assert.equal(worldQaProgress(await readWorldQaArchive(store)).captured,0);
 const normalized=normalizeIphoneQa('world',world('home','realm'),{...ctx,scene:'home'});
 const saved=await saveWorldQaCapture(store,normalized);
 assert.equal(worldQaProgress(saved).captured,1);
 assert.equal(JSON.parse(exportWorldQaArchive(saved,ctx.capturedAt)).finalWorldsApproved,0);
});
test('Build238 preview profile exposes QA and production profile disables it',async()=>{
 const eas=JSON.parse(await readFile(new URL('../eas.json',import.meta.url),'utf8'));
 for(const profile of ['development','preview']){
  assert.equal(eas.build[profile].distribution,'internal');
  assert.equal(eas.build[profile].env.EXPO_PUBLIC_GUARDIAN_DEVICE_QA,'1');
  assert.equal(eas.build[profile].env.EXPO_PUBLIC_WORLD_COLLISION_QA,'1');
 }
 assert.equal(eas.build.production.distribution,'store');
 assert.equal(eas.build.production.env.EXPO_PUBLIC_GUARDIAN_DEVICE_QA,'0');
 assert.equal(eas.build.production.env.EXPO_PUBLIC_WORLD_COLLISION_QA,'0');
 const source=await readFile(new URL('../components/staarwardd/world-scene.tsx',import.meta.url),'utf8');
 assert.match(source,/normalizeIphoneQa\('guardian',message\.metrics,makeQaContext\(\)\)/);
 assert.match(source,/normalizeIphoneQa\('world',message\.metrics,makeQaContext\(\)\)/);
 assert.match(source,/message\.session !== session/);
 assert.match(source,/setMotionQaSummary\(message.accepted/);
 assert.match(source,/saveWorldQaCapture\(AsyncStorage,report\)/);
 assert.match(source,/exportWorldQaArchive\(archive/);
 assert.match(source,/Alert\.alert\('Clear saved world QA\?'/);
 assert.match(source,/Share\.share/);
 const sanitizer=await readFile(new URL('../src/iphone-qa-controls.ts',import.meta.url),'utf8');
 assert.match(sanitizer,/physicalIphoneOwnerAttestation:false/);
 assert.match(sanitizer,/certification:'UNVERIFIED'/);
 assert.doesNotMatch(source,/fetch\('https:\/\/.*(guardian|world).*qa/);
});
