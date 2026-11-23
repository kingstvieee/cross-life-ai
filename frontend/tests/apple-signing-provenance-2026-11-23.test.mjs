import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectProductionPackage,VERIFIED_CODEMAGIC_IOS_BUILD_HIGH_WATERMARK} from '../scripts/verify-production-package.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const evidence=JSON.parse(readFileSync(path.join(root,'docs/release/apple-signing-evidence-2026-11-23.json'),'utf8'));
const app=JSON.parse(readFileSync(path.join(root,'frontend/app.json'),'utf8'));
const codemagic=readFileSync(path.join(root,'codemagic.yaml'),'utf8');
const macVerifier=readFileSync(path.join(root,'frontend/scripts/verify-build220-ipa.sh'),'utf8');

test('Apple and Codemagic agree: signed build 115 succeeded before planned 116',()=>{
 assert.equal(VERIFIED_CODEMAGIC_IOS_BUILD_HIGH_WATERMARK,115);
 assert.equal(evidence.codemagic.lastSucceededBuild,115);
 assert.equal(evidence.appStoreConnect.build,115);
 assert.equal(evidence.appStoreConnect.testingStatus,'Internal Testing');
 assert.equal(evidence.appStoreConnect.installs,1);
 assert.equal(app.expo.ios.buildNumber,'116');
 assert.equal(evidence.nextCandidate.iosBuild,116);
 assert.equal(evidence.nextCandidate.expoLedgerRevalidated,false);
});

test('new Watch App Store profile matches main App Store certificate and both are provisioned in source',()=>{
 assert.equal(evidence.watch.certificateMatchedInCodemagic,true);
 assert.equal(evidence.watch.validUntil,evidence.codemagic.certificateValidUntil);
 assert.match(codemagic,/STAARHub_AppStore_Codemagic_2026_11_20/);
 assert.match(codemagic,/STAARWatch_AppStore_CertNov19_2026_11_23/);
 assert.match(codemagic,/STAAR QA 109 Distribution/);
 assert.match(codemagic,/STAAR_REQUIRE_WATCH_APP: '1'/);
 assert.match(macVerifier,/embedded\.mobileprovision/);
 assert.match(macVerifier,/WATCH_APP_SIGNED/);
});

test('new Codemagic release workflow remains manual, does not publish, and blocks unsafe backend',()=>{
 assert.match(codemagic,/events: \[\]/);
 assert.doesNotMatch(codemagic,/\n\s*publishing:/);
 assert.match(codemagic,/STAAR_PRODUCTION_BACKEND_URL/);
 assert.match(codemagic,/verify-production-package\.mjs/);
 assert.match(codemagic,/verify-build220-ipa\.sh/);
 assert.doesNotMatch(codemagic,/EXPO_PUBLIC_BACKEND_URL: https:\/\/cross-life-ai\.emergent\.host/);
});

test('a signed past TestFlight build never certifies an unsigned future Guardian and Watch release',async()=>{
 assert.equal(evidence.watch.watchSignedInBuild115,false);
 assert.equal(evidence.nextCandidate.production3DAssetsCertified,false);
 assert.equal(evidence.nextCandidate.watchAppleSignedIpaVerified,false);
 const gate=await inspectProductionPackage();
 assert.equal(gate.readyForSignedBuildAttempt,false);
 for(const blocker of ['guardian','worlds','approved-soundtrack','production-backend-not-certified']){
  assert.ok(gate.blockers.some(x=>x.id===blocker),blocker);
 }
});
