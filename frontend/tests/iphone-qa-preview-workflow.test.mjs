import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {evaluateIphoneQaPreview, verifyIphoneQaPreview} from '../scripts/verify-internal-iphone-qa-preview.mjs';

const read=(relative)=>readFile(new URL('../'+relative,import.meta.url),'utf8');
const defaults=async()=>({
 app:JSON.parse(await read('app.json')),
 eas:JSON.parse(await read('eas.json')),
 sceneHost:await read('components/staarwardd/world-scene.tsx'),
 qaBoundary:await read('src/iphone-qa-controls.ts'),
 qaArchive:await read('src/iphone-qa-archive.ts'),
 guardianLock:await read('src/guardian-armor-lock.ts'),
 worldLock:await read('scene-src/world-review-only-shas.mjs'),
});

test('Internal iPhone preview source-only readiness passes while explicitly denying Apple and device claims',async()=>{
 const preflight=await verifyIphoneQaPreview();
 assert.equal(preflight.schema,'staarwardd-internal-iphone-preview-source-preflight-v1');
 assert.deepEqual(preflight.blockers,[]);
 assert.equal(preflight.sourceReadyForOwnerBuildApproval,true);
 assert.equal(preflight.releaseMode,'INTERNAL_IOS_QA_ONLY');
 assert.equal(preflight.iosBuild,'116');
 assert.equal(preflight.noSigningOrSubmissionPerformed,true);
 assert.equal(preflight.noOwnerDeviceOrAppleCredentialsInspected,true);
 assert.equal(preflight.noPhysicalIphoneTestPerformed,true);
 assert.equal(preflight.noTestFlightUploadPerformed,true);
 assert.equal(preflight.productionReleaseAuthorized,false);
});

test('Internal iPhone build workflow is manual, owner-approved and never silently pushes TestFlight',async()=>{
 const wf=await read('.eas/workflows/iphone-qa-preview.yml');
 assert.match(wf,/on:\s*\n\s*workflow_dispatch:/);
 assert.match(wf,/1\.0\.4 \(109\) - INTERNAL IPHONE QA ONLY/);
 assert.match(wf,/uses: eas\/checkout/);
 assert.match(wf,/node scripts\/verify-internal-iphone-qa-preview\.mjs/);
 assert.match(wf,/owner_build_approval:[\s\S]*?needs: \[preflight\][\s\S]*?type: require-approval/);
 assert.match(wf,/build_ios:[\s\S]*?needs: \[preflight, owner_build_approval\]/);
 assert.match(wf,/profile: preview/);
 assert.match(wf,/environment: preview/);
 assert.match(wf,/refresh_ad_hoc_provisioning_profile: false/);
 assert.doesNotMatch(wf,/\n\s*push:|\n\s*schedule:|type: testflight|eas submit|profile: production|type: submit/);
});

test('Wrong app identity, QA profile misconfiguration, accidental production QA and missing artifact guards fail closed',async()=>{
 const base=await defaults();
 const mutations=[
   [{app:{...base.app,expo:{...base.app.expo,owner:'other-owner'}}},'wrong_eas_owner'],
   [{app:{...base.app,expo:{...base.app.expo,ios:{...base.app.expo.ios,buildNumber:'105'}}}},'unexpected_ios_build_number'],
   [{eas:{...base.eas,build:{...base.eas.build,preview:{...base.eas.build.preview,distribution:'store'}}}},'preview_not_internal'],
   [{eas:{...base.eas,build:{...base.eas.build,preview:{...base.eas.build.preview,
      env:{...base.eas.build.preview.env,EXPO_PUBLIC_WORLD_COLLISION_QA:'0'}}}}},'world_qa_disabled'],
   [{eas:{...base.eas,build:{...base.eas.build,production:{...base.eas.build.production,
      env:{...base.eas.build.production.env,EXPO_PUBLIC_GUARDIAN_DEVICE_QA:'1'}}}}},'guardian_qa_enabled_in_production'],
   [{guardianLock:''},'approved_face_reference_missing'],
   [{worldLock:''},'private_world_quarantine_missing'],
   [{sceneHost:''},'device_qa_controls_missing'],
   [{qaBoundary:''},'telemetry_fail_closed_boundary_missing'],
   [{qaArchive:''},'ten_world_diagnostic_archive_missing'],
 ];
 for(const [mutation,reason] of mutations){
   const checked=evaluateIphoneQaPreview({...base,...mutation});
   assert.equal(checked.sourceReadyForOwnerBuildApproval,false,reason);
   assert.ok(checked.blockers.includes(reason),reason);
   assert.equal(checked.productionReleaseAuthorized,false);
 }
});

test('TestFlight production workflow is separate and still requires its existing strict preflight',async()=>{
 const release=await read('.eas/workflows/testflight-release.yml');
 const internal=await read('.eas/workflows/iphone-qa-preview.yml');
 assert.match(release,/node scripts\/verify-production-package\.mjs/);
 assert.match(release,/type: testflight/);
 assert.match(release,/founder_acceptance/);
 assert.doesNotMatch(internal,/founder_acceptance|type: testflight/);
});
