import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {
 inspectProductionPackage,VERIFIED_EAS_IOS_BUILD_HIGH_WATERMARK,VERIFIED_CODEMAGIC_IOS_BUILD_HIGH_WATERMARK,RECOVERED_EXTERNAL_IOS_BUILD_FLOOR,EXPECTED_APP
} from '../scripts/verify-production-package.mjs';

const app=build=>({expo:{version:'1.0.4',
 owner:EXPECTED_APP.easOwner,ios:{buildNumber:String(build),
 bundleIdentifier:EXPECTED_APP.bundleId,appleTeamId:EXPECTED_APP.appleTeamId},
 extra:{eas:{projectId:EXPECTED_APP.easProjectId}}}});
const eas={build:{production:{distribution:'store',ios:{simulator:false}}},
 submit:{production:{ios:{ascAppId:EXPECTED_APP.ascAppId}}}};

async function fixture(build){
 const root=await mkdtemp(path.join(tmpdir(),'staar-b251-ios-'));
 await writeFile(path.join(root,'app.json'),JSON.stringify(app(build)));
 await writeFile(path.join(root,'eas.json'),JSON.stringify(eas));
 return root;
}
test('Verified Expo ledger distinguishes App Store 105 from higher internal issued 108',()=>{
 assert.equal(VERIFIED_EAS_IOS_BUILD_HIGH_WATERMARK,108);
 assert.equal(RECOVERED_EXTERNAL_IOS_BUILD_FLOOR,115);
 assert.equal(VERIFIED_CODEMAGIC_IOS_BUILD_HIGH_WATERMARK,115);
});
test('All known 105-115 source builds are rejected because recovered Codemagic issue supersedes Expo ledger',async()=>{
 for(const build of [105,106,107,108,109,110,111,112,113,114,115]){
  const root=await fixture(build);
  try{
   const r=await inspectProductionPackage(root,105);
   assert.equal(r.readyForSignedBuildAttempt,false);
   assert.ok(r.blockers.some(x=>x.id==='ios-build-number'),String(build));
  }finally{await rm(root,{recursive:true,force:true});}
 }
});
test('109 is blocked by authenticated Codemagic 115 even while models and audio are absent',async()=>{
 const root=await fixture(109);
 try{
  const r=await inspectProductionPackage(root,105);
  assert.equal(r.facts.iosBuildNumber,'109');
  assert.equal(r.facts.expoHighestKnownIssuedIosBuild,108);
  assert.equal(r.facts.unconfirmedExternalBuildFloor,115);
  assert.equal(r.facts.verifiedCodemagicBuildHighWatermark,115);
  assert.equal(r.blockers.some(x=>x.id==='ios-build-number'),true);
  assert.equal(r.readyForSignedBuildAttempt,false);
  for(const k of ['guardian','worlds','approved-soundtrack','startup-film'])
   assert.ok(r.blockers.some(x=>x.id===k),k);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('Next 116 signing workflow remains manual but gated by source assets and live ledgers',async()=>{
 const root=new URL('../',import.meta.url);
 const appCfg=JSON.parse(await readFile(new URL('app.json',root),'utf8'));
 const production=await readFile(new URL('.eas/workflows/testflight-release.yml',root),'utf8');
 const qa=await readFile(new URL('.eas/workflows/iphone-qa-preview.yml',root),'utf8');
 const verifier=await readFile(new URL('scripts/verify-build220-ipa.sh',root),'utf8');
 assert.equal(appCfg.expo.ios.buildNumber,'116');
 for(const file of [production,qa]){
  assert.ok(file.includes('116'));
  assert.ok(!file.includes('1.0.4 (109)'));
 }
 assert.match(verifier,/expected_build/);
 assert.match(verifier,/WATCH_APP_SIGNED/);
 assert.match(production,/type: require-approval/);
 assert.match(qa,/type: require-approval/);
 assert.match(production,/node scripts\/verify-production-package.mjs/);
});
