/** STAARWAARDD Build239 — local QA evidence triage, not hardware attestation.
 * Only processes operator-exported, already-sanitized JSON supplied as files.
 * Never uploads telemetry, changes model acceptance, calls Expo/Apple or asserts
 * that a JSON file proves an actual iPhone was involved.
 */
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {REVIEW_ONLY_COLLIDER_WORLD_HASH_SET} from '../scene-src/world-review-only-shas.mjs';
import {assertGuardianModelNotRejected} from '../scene-src/approved-guardian-asset.mjs';

export const WORLD_QA_ENTRIES=Object.freeze([
 ['home-residence','home','residence'],
 ['work-command','work','command'],
 ['creativity-dream','creativity','dream'],
 ['wellbeing-health','wellbeing','health'],
 ['relationships-realm','relationships','realm'],
 ['relationships-singles','relationships','singles'],
 ['events-village','events','village'],
 ['style-closet','style','closet'],
 ['staarverse-universe','staarverse','universe'],
 ['staarsonic-studio','staarsonic','studio'],
].map(([key,scene,variant])=>Object.freeze({key,scene,variant})));
const WORLD_MAP=new Map(WORLD_QA_ENTRIES.map(x=>[x.key,x]));
const HASH=/^[a-f0-9]{64}$/;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const safeInt=x=>Number.isSafeInteger(x)&&x>=0;
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const rowResultSet=new Set(['NO_APPROVED_ASSET','INSUFFICIENT_SAMPLES','REVIEW_REQUIRED']);
const requireSafe=(okay,what,failures)=>{if(!okay)failures.push(what);};
const record=(issues)=>Object.freeze({reviewCandidate:issues.length===0,issues});
export function examineGuardianQaReport(guardian){
 const issues=[];
 if(!obj(guardian))return record(['guardian_capture_missing']);
 requireSafe(guardian.schema==='staar-iphone-build238-local-qa-export-v1','guardian_schema_invalid',issues);
 requireSafe(guardian.kind==='guardian'&&guardian.scene==='hub','guardian_wrong_scene',issues);
 requireSafe(guardian.platform==='ios','guardian_platform_not_ios',issues);
 requireSafe(guardian.certification==='UNVERIFIED'&&guardian.physicalIphoneOwnerAttestation===false,
   'guardian_report_must_be_unverified',issues);
 requireSafe(rowResultSet.has(guardian.result),'guardian_result_invalid',issues);
 const m=guardian.metrics;
 if(!obj(m))return record([...issues,'guardian_metrics_missing']);
 requireSafe(m.modelBound===true&&HASH.test(m.modelSha256??''),'guardian_approved_asset_not_bound',issues);
 if(HASH.test(m.modelSha256??'')){
  try{assertGuardianModelNotRejected(m.modelSha256)}
  catch{issues.push('guardian_known_private_or_rejected_model');}
 }
 requireSafe(guardian.result==='REVIEW_REQUIRED','guardian_not_ready_for_manual_review',issues);
 requireSafe(safeInt(m.frameCount)&&m.frameCount>=300,'guardian_insufficient_frames',issues);
 requireSafe(finite(m.frameP95Ms)&&m.frameP95Ms<=33.34,'guardian_frame_p95_above_30fps_budget',issues);
 requireSafe(safeInt(m.audioPacketCount)&&safeInt(m.acceptedAudioPacketCount)&&
    m.audioPacketCount>0&&m.acceptedAudioPacketCount>0&&
    m.acceptedAudioPacketCount<=m.audioPacketCount,'guardian_verified_audio_packets_missing',issues);
 // This NEVER checks final facial match, audio-sync offset or true device identity.
 return record(issues);
}
export function examineWorldQaBundle(bundle){
 const globalIssues=[],worlds={};
 if(!obj(bundle))return {schema:'staar-build239-review-evaluation-v1',
  diagnosticsCaptured:0,diagnosticsReviewCandidates:0,
  worlds:{},globalIssues:['bundle_missing_or_malformed'],
  allWorldsReadyForManualReview:false,finalWorldsAccepted:0,
  deviceCertified:false,releasePermitted:false};
 requireSafe(bundle.schema==='staar-iphone-build238-world-bundle-v1','bundle_schema_invalid',globalIssues);
 requireSafe(bundle.physicalIphoneCertification==='UNVERIFIED'&&
  bundle.deviceOwnerAttestation===false&&bundle.finalWorldsApproved===0,
  'bundle_illegitimately_claims_approval',globalIssues);
 requireSafe(bundle.totalWorlds===10,'wrong_declared_world_count',globalIssues);
 const results=obj(bundle.results)?bundle.results:{};
 requireSafe(obj(bundle.results),'bundle_results_missing',globalIssues);
 const keys=Object.keys(results);
 requireSafe(keys.every(k=>WORLD_MAP.has(k)),'unknown_world_entries',globalIssues);
 const missing=WORLD_QA_ENTRIES.filter(x=>!Object.hasOwn(results,x.key)).map(x=>x.key);
 requireSafe(safeInt(bundle.diagnosticsCaptured)&&bundle.diagnosticsCaptured===keys.length,
  'bundle_capture_count_mismatch',globalIssues);
 requireSafe(Array.isArray(bundle.missing)&&bundle.missing.length===missing.length&&
  missing.every(k=>bundle.missing.includes(k)),
  'bundle_missing_list_mismatch',globalIssues);
 let modelCount=0,candidates=0;
 for(const meta of WORLD_QA_ENTRIES){
   const issues=[],row=results[meta.key];
   if(!obj(row)){worlds[meta.key]=record(['world_capture_missing']);continue;}
   requireSafe(row.schema==='staar-iphone-build238-local-qa-export-v1'&&row.kind==='world',
    'world_schema_invalid',issues);
   requireSafe(row.scene===meta.scene&&row.variant===meta.variant,'world_identity_mismatch',issues);
   requireSafe(row.platform==='ios','world_platform_not_ios',issues);
   requireSafe(row.certification==='UNVERIFIED'&&row.physicalIphoneOwnerAttestation===false,
    'world_illegitimately_claims_approval',issues);
   requireSafe(rowResultSet.has(row.result),'world_result_invalid',issues);
   const m=row.metrics;
   if(!obj(m)){worlds[meta.key]=record([...issues,'world_metrics_missing']);continue;}
   if(m.modelBound===true)modelCount++;
   requireSafe(m.modelBound===true&&HASH.test(m.modelSha256??''),
    'approved_world_model_not_bound',issues);
   if(HASH.test(m.modelSha256??'')&&REVIEW_ONLY_COLLIDER_WORLD_HASH_SET.has(m.modelSha256))
     issues.push('known_review_only_world_glb');
   requireSafe(m.worldKey===meta.key,'world_metric_identity_mismatch',issues);
   requireSafe(row.result==='REVIEW_REQUIRED','world_not_ready_for_manual_review',issues);
   requireSafe(safeInt(m.frameCount)&&m.frameCount>=300,'world_insufficient_frames',issues);
   requireSafe(finite(m.frameIntervalP95Ms)&&m.frameIntervalP95Ms<=33.34,
    'world_frame_p95_above_30fps_budget',issues);
   requireSafe(safeInt(m.steps)&&m.steps>=20&&
    safeInt(m.walkSteps)&&m.walkSteps>0&&
    safeInt(m.runSteps)&&m.runSteps>0&&
    m.walkSteps+m.runSteps===m.steps,
    'world_walk_run_samples_missing',issues);
   requireSafe(safeInt(m.blockedSteps)&&m.blockedSteps>0&&m.blockedSteps<=m.steps,
    'world_wall_contact_not_exercised',issues);
   requireSafe(finite(m.distanceMeters)&&m.distanceMeters>0,
    'world_locomotion_distance_not_recorded',issues);
   requireSafe(safeInt(m.groundTriangles)&&m.groundTriangles>0&&
    safeInt(m.collisionTriangles)&&m.collisionTriangles>0,
    'world_true_triangle_geometry_missing',issues);
   requireSafe(m.routePreflightPassed===true&&m.webglContextLost===false,
    'world_route_or_webgl_failure',issues);
   // These samples are solely a request for independent review, never a pass.
   worlds[meta.key]=record(issues);
   if(issues.length===0)candidates++;
 }
 requireSafe(bundle.loadedModelDiagnostics===modelCount,
  'bundle_loaded_model_count_mismatch',globalIssues);
 return Object.freeze({
   schema:'staar-build239-review-evaluation-v1',
   diagnosticsCaptured:keys.length,diagnosticsReviewCandidates:candidates,
   worlds,globalIssues,missing,
   allWorldsReadyForManualReview:globalIssues.length===0&&candidates===10,
   finalWorldsAccepted:0,deviceCertified:false,releasePermitted:false,
   independentChecksStillRequired:[
    'actual_physical_iphone_provenance_and_signed_ipa',
    'portal_endpoint_and_ground_support_manual_test',
    'human_verified_collision_no_penetration',
    'guardian_actual_body_rig_motion_and_face',
    'guardian_external_speech_offset_measurement',
    'founder_exact_binary_visual_acceptance',
   ],
 });
}
const entry=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(entry){
 try{
  const [bundlePath,guardianPath]=process.argv.slice(2);
  if(!bundlePath||process.argv.length>5)throw Error('Usage: node scripts/build239-review-qa-bundle.mjs /private/world-bundle.json [/private/guardian.json]');
  const bundle=JSON.parse(await readFile(bundlePath,'utf8'));
  const world=examineWorldQaBundle(bundle);
  const guardian=guardianPath?examineGuardianQaReport(JSON.parse(await readFile(guardianPath,'utf8'))):null;
  // Redact sessions, model hashes and per-device metadata in stdout.
  process.stdout.write(JSON.stringify({world,guardian},null,2)+'\n');
  if(world.globalIssues.length||!world.allWorldsReadyForManualReview||
     (guardian&&guardian.issues.length))process.exitCode=1;
 }catch(err){process.stderr.write(String(err?.message??err)+'\n');process.exitCode=2;}
}
