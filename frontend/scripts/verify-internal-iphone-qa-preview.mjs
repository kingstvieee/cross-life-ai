/**
 * STAARWAARDD iPhone QA preview: source-only readiness gate.
 *
 * Read-only. NEVER calls Expo, Apple, signing, device enrollment or submission.
 * A green result authorizes only requesting owner approval in an EAS Workflow;
 * it does not prove credentials, credits, cost, IPA, iPhone or App Store status.
 */
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {EXPECTED_APP} from './verify-production-package.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
export const FRONTEND=path.resolve(HERE,'..');
const isRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(v,expected)=>v===expected;
export function evaluateIphoneQaPreview({app,eas,sceneHost,qaBoundary,qaArchive,guardianLock,worldLock}={}){
 const blocked=[];
 const require=(pass,code)=>{if(!pass)blocked.push(code);};
 const expo=app?.expo,ios=expo?.ios;
 require(exact(expo?.owner,EXPECTED_APP.easOwner),'wrong_eas_owner');
 require(exact(expo?.extra?.eas?.projectId,EXPECTED_APP.easProjectId),'wrong_eas_project');
 require(exact(ios?.bundleIdentifier,EXPECTED_APP.bundleId),'wrong_apple_bundle');
 require(exact(ios?.appleTeamId,EXPECTED_APP.appleTeamId),'wrong_apple_team');
 require(exact(expo?.version,'1.0.4'),'unexpected_app_version');
 require(exact(ios?.buildNumber,'109'),'unexpected_ios_build_number');
 require(Array.isArray(expo?.plugins)&&expo.plugins.includes('@bacons/apple-targets'),
   'watch_target_plugin_absent');
 require(exact(eas?.build?.preview?.distribution,'internal'),'preview_not_internal');
 require(exact(eas?.build?.preview?.ios?.simulator,false),'preview_not_physical_device');
 require(exact(eas?.build?.preview?.env?.EXPO_PUBLIC_GUARDIAN_DEVICE_QA,'1'),'guardian_qa_disabled');
 require(exact(eas?.build?.preview?.env?.EXPO_PUBLIC_WORLD_COLLISION_QA,'1'),'world_qa_disabled');
 require(exact(eas?.build?.preview?.env?.STAAR_PRIVATE_DEVICE_QA_BUILD,'1'),'private_qa_bundle_disabled');
 require(exact(eas?.build?.production?.distribution,'store'),'production_profile_changed');
 require(exact(eas?.build?.production?.env?.EXPO_PUBLIC_GUARDIAN_DEVICE_QA,'0'),
   'guardian_qa_enabled_in_production');
 require(exact(eas?.build?.production?.env?.EXPO_PUBLIC_WORLD_COLLISION_QA,'0'),
   'world_qa_enabled_in_production');
 require(eas?.build?.production?.env?.STAAR_PRIVATE_DEVICE_QA_BUILD !== '1',
   'private_qa_enabled_in_production');
 require(exact(String(eas?.submit?.production?.ios?.ascAppId),EXPECTED_APP.ascAppId),
   'app_store_submission_target_changed');
 require(isRecord(eas?.build?.development)&&
   exact(eas.build.development.env?.EXPO_PUBLIC_GUARDIAN_DEVICE_QA,'1'),
   'development_qa_disabled');
 require(typeof sceneHost==='string'&&sceneHost.includes("Platform.OS==='ios'")&&
   sceneHost.includes('normalizeIphoneQa')&&sceneHost.includes('exportWorldQaArchive')&&
   sceneHost.includes('worldSceneHtml(world, variant, session, qaEnabled, worldQaEnabled, guardianPresentation, reduceGuardianMotion)') &&
   sceneHost.includes('const qaEnabled = !guardianPresentation &&'),
   'device_qa_controls_missing');
 require(typeof qaBoundary==='string'&&qaBoundary.includes("certification:'UNVERIFIED'")&&
   qaBoundary.includes('physicalIphoneOwnerAttestation:false')&&
   qaBoundary.includes('NO_APPROVED_ASSET'),
   'telemetry_fail_closed_boundary_missing');
 require(typeof qaArchive==='string'&&qaArchive.includes('WORLD_QA_KEYS')&&
   qaArchive.includes('finalWorldsApproved:0'),
   'ten_world_diagnostic_archive_missing');
 require(typeof guardianLock==='string'&&
   guardianLock.includes('4d739795c55711a19cd6c4ccb670053697b3ed8e23c2e3648940dac43433540b'),
   'approved_face_reference_missing');
 require(typeof worldLock==='string'&&
   worldLock.includes('REVIEW_ONLY_BUILD237_FLOOR_WORLD_HASHES')&&
   worldLock.includes('REVIEW_ONLY_COLLIDER_WORLD_HASH_SET'),
   'private_world_quarantine_missing');
 return Object.freeze({
   schema:'staarwardd-internal-iphone-preview-source-preflight-v1',
   sourceReadyForOwnerBuildApproval:blocked.length===0,
   blockers:blocked,
   releaseMode:'INTERNAL_IOS_QA_ONLY',
   version:'1.0.4',
   iosBuild:'109',
   noSigningOrSubmissionPerformed:true,
   noOwnerDeviceOrAppleCredentialsInspected:true,
   noPhysicalIphoneTestPerformed:true,
   noTestFlightUploadPerformed:true,
   productionReleaseAuthorized:false,
   note:'EAS owner approval, registered device, ad hoc profile, possible charges, '
     +'actual staged assets, signer verification and on-iPhone QA remain independent.',
 });
}
export async function verifyIphoneQaPreview(root=FRONTEND){
 const file=async name=>readFile(path.join(root,name),'utf8');
 const json=async name=>JSON.parse(await file(name));
 const [app,eas,sceneHost,qaBoundary,qaArchive,guardianLock,worldLock]=await Promise.all([
   json('app.json'),json('eas.json'),
   file('components/staarwardd/world-scene.tsx'),
   file('src/iphone-qa-controls.ts'),
   file('src/iphone-qa-archive.ts'),
   file('src/guardian-armor-lock.ts'),
   file('scene-src/world-review-only-shas.mjs'),
 ]);
 return evaluateIphoneQaPreview({
   app,eas,sceneHost,qaBoundary,qaArchive,guardianLock,worldLock,
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
   const result=await verifyIphoneQaPreview();
   process.stdout.write(JSON.stringify(result,null,2)+'\n');
   if(!result.sourceReadyForOwnerBuildApproval)process.exitCode=1;
 }catch(err){
   process.stderr.write(String(err?.message||err)+'\n');process.exitCode=1;
 }
}
