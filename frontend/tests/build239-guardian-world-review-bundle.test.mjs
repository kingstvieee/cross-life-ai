import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 WORLD_QA_ENTRIES,examineWorldQaBundle,examineGuardianQaReport
} from '../scripts/build239-review-qa-bundle.mjs';
import {REQUIRED_WORLD_ASSETS} from '../scene-src/approved-world-assets.mjs';
import {REVIEW_ONLY_BUILD237_FLOOR_WORLD_HASHES} from '../scene-src/world-review-only-shas.mjs';
import {PRIVATE_BUILD236_TRANSITION_QA_SHA256}
 from '../scene-src/approved-guardian-asset.mjs';
const SHA='a'.repeat(64);
const sample=(meta)=>({
 schema:'staar-iphone-build238-local-qa-export-v1',
 kind:'world',scene:meta.scene,variant:meta.variant,
 platform:'ios',session:'local-qa-test',
 capturedAt:'2026-11-17T18:00:00.000Z',
 result:'REVIEW_REQUIRED',certification:'UNVERIFIED',
 physicalIphoneOwnerAttestation:false,
 metrics:{modelBound:true,modelSha256:SHA,worldKey:meta.key,
  frameCount:620,frameIntervalP95Ms:16.667,steps:120,
  walkSteps:65,runSteps:55,blockedSteps:12,
  distanceMeters:7.2,groundTriangles:60,collisionTriangles:170,
  routePreflightPassed:true,webglContextLost:false}
});
const makeBundle=()=>({
 schema:'staar-iphone-build238-world-bundle-v1',totalWorlds:10,
 diagnosticsCaptured:10,loadedModelDiagnostics:10,
 physicalIphoneCertification:'UNVERIFIED',deviceOwnerAttestation:false,
 finalWorldsApproved:0,missing:[],
 results:Object.fromEntries(WORLD_QA_ENTRIES.map(x=>[x.key,sample(x)]))
});
const guardian=()=>({
 schema:'staar-iphone-build238-local-qa-export-v1',kind:'guardian',
 scene:'hub',variant:'realm',platform:'ios',
 session:'local-qa-test',capturedAt:'2026-11-17T18:00:00.000Z',
 certification:'UNVERIFIED',physicalIphoneOwnerAttestation:false,
 result:'REVIEW_REQUIRED',
 metrics:{modelBound:true,modelSha256:SHA,frameCount:600,
 frameP95Ms:16.9,audioPacketCount:200,acceptedAudioPacketCount:190}
});
test('World bundle has exact all-ten canonical IDs and produces review candidates, NEVER physical iPhone or release acceptance',()=>{
 assert.deepEqual(WORLD_QA_ENTRIES.map(x=>x.key).sort(),REQUIRED_WORLD_ASSETS.slice().sort());
 const r=examineWorldQaBundle(makeBundle());
 assert.equal(r.diagnosticsCaptured,10);
 assert.equal(r.diagnosticsReviewCandidates,10);
 assert.deepEqual(r.globalIssues,[]);
 assert.equal(r.allWorldsReadyForManualReview,true);
 assert.equal(r.finalWorldsAccepted,0);
 assert.equal(r.deviceCertified,false);
 assert.equal(r.releasePermitted,false);
 assert.ok(r.independentChecksStillRequired.length>=6);
});
test('Missing capture, fabricated counts, unknown extra keys and spoofed native approval never qualify',()=>{
 const variants=[
  (b)=>{delete b.results['style-closet'];b.diagnosticsCaptured=9;b.loadedModelDiagnostics=9;b.missing=['style-closet'];},
  (b)=>{b.diagnosticsCaptured=9;},
  (b)=>{b.results['malicious-world']=sample(WORLD_QA_ENTRIES[0]);b.diagnosticsCaptured=11;b.loadedModelDiagnostics=11;},
  (b)=>{b.finalWorldsApproved=10;},
  (b)=>{b.deviceOwnerAttestation=true;},
  (b)=>{b.physicalIphoneCertification='PASS';},
  (b)=>{b.results['home-residence'].certification='CERTIFIED';},
  (b)=>{b.results['home-residence'].physicalIphoneOwnerAttestation=true;},
  (b)=>{b.results['home-residence'].scene='work';},
  (b)=>{b.results['home-residence'].metrics.worldKey='work-command';},
  (b)=>{b.results['home-residence'].metrics.modelSha256='invalid';},
  (b)=>{b.results['home-residence'].result='APPROVED';},
 ];
 for(const edit of variants){
  const b=makeBundle();edit(b);
  const r=examineWorldQaBundle(b);
  assert.equal(r.allWorldsReadyForManualReview,false);
  assert.equal(r.finalWorldsAccepted,0);
  assert.equal(r.deviceCertified,false);
  assert.equal(r.releasePermitted,false);
 }
});
test('Insufficient motion, missing blocked-wall exercise, bad frame p95, no floor and WebGL loss fail ten-world review',()=>{
 const mutants=[
  m=>{m.walkSteps=0;m.runSteps=120;},
  m=>{m.runSteps=0;m.walkSteps=120;},
  m=>{m.blockedSteps=0;},
  m=>{m.steps=10;},
  m=>{m.frameCount=299;},
  m=>{m.frameIntervalP95Ms=38;},
  m=>{m.distanceMeters=0;},
  m=>{m.groundTriangles=0;},
  m=>{m.collisionTriangles=0;},
  m=>{m.webglContextLost=true;},
  m=>{m.routePreflightPassed=false;},
 ];
 for(const edit of mutants){
  const bundle=makeBundle();edit(bundle.results['home-residence'].metrics);
  const r=examineWorldQaBundle(bundle);
  assert.equal(r.allWorldsReadyForManualReview,false);
  assert.equal(r.diagnosticsReviewCandidates,9);
  assert.equal(r.releasePermitted,false);
 }
});
test('Known Build237 floor GLBs are quarantined even when a forged report claims successful movement',()=>{
 const b=makeBundle();
 b.results['home-residence'].metrics.modelSha256=REVIEW_ONLY_BUILD237_FLOOR_WORLD_HASHES['home-residence'];
 const r=examineWorldQaBundle(b);
 assert.equal(r.allWorldsReadyForManualReview,false);
 assert.ok(r.worlds['home-residence'].issues.includes('known_review_only_world_glb'));
});
test('Guardian normal recordings get manual review only; private Build236 rig cannot qualify',()=>{
 const normal=examineGuardianQaReport(guardian());
 assert.equal(normal.reviewCandidate,true);
 assert.equal(normal.issues.length,0);
 const bad=guardian();
 bad.metrics.modelSha256=PRIVATE_BUILD236_TRANSITION_QA_SHA256;
 const blocked=examineGuardianQaReport(bad);
 assert.equal(blocked.reviewCandidate,false);
 assert.ok(blocked.issues.includes('guardian_known_private_or_rejected_model'));
});
test('Guardian absent asset, no audio, poor FPS or forged owner/device flags fail closed',()=>{
 const variants=[
  g=>{g.certification='PASS';},
  g=>{g.physicalIphoneOwnerAttestation=true;},
  g=>{g.metrics.modelBound=false;g.metrics.modelSha256=null;},
  g=>{g.metrics.frameCount=200;},
  g=>{g.metrics.frameP95Ms=48;},
  g=>{g.metrics.acceptedAudioPacketCount=0;},
  g=>{g.metrics.acceptedAudioPacketCount=300;},
  g=>{g.result='NO_APPROVED_ASSET';}
 ];
 for(const edit of variants){const g=guardian();edit(g);assert.equal(examineGuardianQaReport(g).reviewCandidate,false);}
});
test('Build239 reads exports locally only and does not replace release gate or alter the configured iOS Build109',async()=>{
 const source=await readFile(new URL('../scripts/build239-review-qa-bundle.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/fetch\(|https:\/\/|GenUI|eas build|eas submit|Apple API/i);
 assert.match(source,/releasePermitted:false/);
 assert.match(source,/finalWorldsAccepted:0/);
 const app=JSON.parse(await readFile(new URL('../app.json',import.meta.url),'utf8'));
 // Guard against stale QA harness expectations rewriting a release version.
 // This must match the existing Expo baseline, not consume another build slot.
 assert.equal(app.expo.ios.buildNumber,'109');
 assert.doesNotMatch(source,/writeFile.*app\.json|eas build|eas submit/i);
});
