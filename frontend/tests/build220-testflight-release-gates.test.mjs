import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {RELEASE_REQUIREMENTS,evaluateProductionReadiness} from '../src/release-readiness.ts';

test('Build 220 TestFlight cannot be auto-complete from successful GitHub simulator CI',()=>{
 assert.equal(RELEASE_REQUIREMENTS.length,11);
 for(const key of ['tenWorldNativeCollisionVerified',
    'starCenttinelRevocationAndRecoveryVerified','privateEasArchiveInspected',
    'nativeSignedIpaVerified','founderTestFlightAccepted']){
  assert.ok(RELEASE_REQUIREMENTS.includes(key));
 }
 const evidence=Object.fromEntries(RELEASE_REQUIREMENTS.map(k=>[k,true]));
 assert.equal(evaluateProductionReadiness(evidence).ready,true);
 for(const missing of RELEASE_REQUIREMENTS){
  const blocked=evaluateProductionReadiness({...evidence,[missing]:false});
  assert.equal(blocked.ready,false);
  assert.ok(blocked.blockers.includes(missing));
 }
});

test('Build 220 macOS signed IPA verifier checks real archive signing and fixed Apple team/build',async()=>{
 const code=await readFile(new URL('../scripts/verify-build220-ipa.sh',import.meta.url),'utf8');
 for(const marker of ['codesign --verify --deep --strict',
   'TeamIdentifier=R9BPDSU4BW','com.emergent.crosslifeai.z79271',
   '"$build" == "109"','"$version" == "1.0.4"','SIGNED_IPA_SHA256']){
  assert.ok(code.includes(marker),marker);
 }
});

test('Build 220 founder approval and actual signed build remain required in EAS workflow',async()=>{
 const wf=await readFile(new URL('../.eas/workflows/testflight-release.yml',import.meta.url),'utf8');
 assert.ok(wf.includes('type: require-approval'));
 assert.ok(wf.includes('node scripts/verify-owner-testflight-candidate.mjs'));
 const gate=await readFile(new URL('../scripts/verify-owner-testflight-candidate.mjs',import.meta.url),'utf8');
 // Candidate exception is limited to owner-supplied fallback visual assets.
 // Identity, private media hash, archive, signing and permission checks remain.
 assert.match(gate,/inspectProductionPackage/);
 assert.match(gate,/new Set\(\['guardian','worlds','independent-evidence'\]\)/);
 assert.match(gate,/const blockers=result\.blockers\.filter/);
 assert.match(gate,/testFlightCandidateReady:blockers\.length===0/);
 assert.match(gate,/productionAssetCertification:false/);
 assert.ok(wf.includes('type: testflight'));
 assert.ok(wf.includes('needs: [build_ios, founder_acceptance]'));
});
