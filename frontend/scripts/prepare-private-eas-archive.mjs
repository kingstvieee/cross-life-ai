/**
 * Build 195 — private EAS archive preparation and independent archive inspection.
 * Source files and this script may be public; the owner-approved audio is not.
 * This script NEVER invokes eas build, uploads assets, or creates a TestFlight release.
 *
 * From the repository root / owner-controlled checkout:
 *   node frontend/scripts/prepare-private-eas-archive.mjs prepare
 *   eas build:inspect --platform ios --profile production --stage archive --output ./private-eas-inspection
 *   node frontend/scripts/prepare-private-eas-archive.mjs inspect ./private-eas-inspection
 */
import {readFile, writeFile, stat, chmod, realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyApprovedSoundtrack, LOCKED_GUARDIAN_MUSIC} from './verify-approved-soundtrack.mjs';
import {verifyStagedNativeSource, PRIVATE_SOURCE_RELATIVE, AUDIO_RELATIVE} from './stage-approved-startup-audio.mjs';

export const FRONTEND_ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const REPOSITORY_ROOT=path.resolve(FRONTEND_ROOT,'..');
export const EAS_INCLUDE_PATHS=Object.freeze([
 'frontend/'+AUDIO_RELATIVE,
 'frontend/'+PRIVATE_SOURCE_RELATIVE,
]);

function scopeFrontendIgnore(line){
 if(!line || line.startsWith('#'))return line;
 const trimmed=line.trim();
 if(!trimmed)return line;
 let negative=trimmed.startsWith('!');
 const base=negative?trimmed.slice(1):trimmed;
 if(!base)return line;
 // The EAS ignore file is at the Git root, unlike frontend/.gitignore.
 const scoped='frontend/'+base.replace(/^\/+/,'');
 return (negative?'!':'')+scoped;
}

export function generatePrivateEasIgnore(rootGitignore,frontendGitignore){
 if(typeof rootGitignore!=='string'||typeof frontendGitignore!=='string')throw Error('gitignore_sources_required');
 if(!rootGitignore.trim()||!frontendGitignore.trim())throw Error('empty_ignore_source');
 const root=rootGitignore.trimEnd();
 const front=frontendGitignore.trimEnd().split(/\r?\n/).map(scopeFrontendIgnore).join('\n');
 return [
  '# GENERATED LOCALLY FOR A SINGLE PRIVATE APPROVED BUILD — DO NOT COMMIT',
  '# Includes both Git and frontend ignore rules. Review before uploading to Expo.',
  root,
  '',
  '# Frontend project local excludes, re-scoped to Git root',
  front,
  '',
  '# The following 2 specific, owner-approved files MUST be in the inspected EAS upload.',
  '# Negated globs are intentionally last; Expo honors these over prior excludes.',
  ...EAS_INCLUDE_PATHS.map(x=>'!'+x),
  ''
 ].join('\n');
}

/** Build 211: prove the exact generated private EAS include rules exist in the
 * owner-controlled checkout BEFORE any signed build may be attempted.
 * This is not a remote EAS archive attestation: inspectPrivateEasArchive remains
 * necessary to verify that Expo actually receives the approved AAC bytes.
 */
export async function verifyPrivateEasUploadRules({
 repoRoot=REPOSITORY_ROOT,frontendRoot=path.join(repoRoot,'frontend')
}={}){
 const [rootIgnore,frontendIgnore,easIgnore]=await Promise.all([
  readFile(path.join(repoRoot,'.gitignore'),'utf8'),
  readFile(path.join(frontendRoot,'.gitignore'),'utf8'),
  readFile(path.join(repoRoot,'.easignore'),'utf8'),
 ]);
 const canonical=generatePrivateEasIgnore(rootIgnore,frontendIgnore);
 if(easIgnore!==canonical)throw Error('private_eas_ignore_missing_or_noncanonical');
 const digest=createHash('sha256').update(easIgnore,'utf8').digest('hex');
 return {verifiedLocalUploadRules:true,sha256:digest,includePaths:[...EAS_INCLUDE_PATHS],
  caveat:'Only local upload-rule parity. Not EAS archive upload, signing, or device playback.'};
}

export async function preparePrivateEasArchive({
 repoRoot=REPOSITORY_ROOT, frontendRoot=path.join(repoRoot,'frontend'), expected=LOCKED_GUARDIAN_MUSIC
}={}){
 // No file is written until both *actual* private inputs are verified.
 const [audio, native,rootIgnore,frontendIgnore]=await Promise.all([
  verifyApprovedSoundtrack(frontendRoot,expected),
  verifyStagedNativeSource(frontendRoot,expected),
  readFile(path.join(repoRoot,'.gitignore'),'utf8'),
  readFile(path.join(frontendRoot,'.gitignore'),'utf8'),
 ]);
 const data=generatePrivateEasIgnore(rootIgnore,frontendIgnore);
 const destination=path.join(repoRoot,'.easignore');
 const existing=await readFile(destination,'utf8').catch(err=>{
  if(err?.code==='ENOENT')return null;
  throw err;
 });
 if(existing!==null && existing!==data)throw Error('existing_easignore_not_overwritten');
 if(existing===null)await writeFile(destination,data,{mode:0o600,flag:'wx'});
 await chmod(destination,0o600);
 return {readyForArchiveInspection:true,repoRoot,includePaths:[...EAS_INCLUDE_PATHS],
  soundtrackSha256:audio.sha256,sourceModule:native.sourceModule,
  easIgnorePath:destination,
  next:'Run eas build:inspect --platform ios --profile production --stage archive --output <fresh-private-dir>, then run this script inspect <dir>. Do NOT submit or build until all production acceptance gates pass.'};
}

export async function inspectPrivateEasArchive({
 archiveRoot,expected=LOCKED_GUARDIAN_MUSIC,checkoutRoot=null
}={}){
 // Build 221: a checkout passed off as the EAS archive is not independent.
 // Realpath defeats symlinks to the checkout; both containing and nested
 // directories are rejected. This is necessary, not sufficient, provenance.
 if(checkoutRoot){
   const inspected=await realpath(archiveRoot);
   const checkout=await realpath(checkoutRoot);
   const prefix=(a,b)=>b===a||b.startsWith(a+path.sep);
   if(prefix(checkout,inspected)||prefix(inspected,checkout))
     throw new Error('private_archive_overlaps_checkout');
 }

 if(!archiveRoot||typeof archiveRoot!=='string')throw Error('inspected_archive_directory_required');
 const root=path.resolve(archiveRoot);
 const candidates=[path.join(root,'frontend'),root];
 const checks=[];
 for(const frontendRoot of candidates){
  try{
   const [audio,source]=await Promise.all([
    verifyApprovedSoundtrack(frontendRoot,expected),
    verifyStagedNativeSource(frontendRoot,expected),
   ]);
   checks.push({projectRoot:frontendRoot,sha256:audio.sha256,sourceModule:source.sourceModule});
  }catch(err){
   checks.push({projectRoot:frontendRoot,failed:String(err?.message||err)});
  }
 }
 const match=checks.find(x=>x.sha256===expected.sha256);
 if(!match)throw Error('private_audio_absent_or_altered_in_eas_inspected_archive');
 return {archiveVerified:true,projectRoot:match.projectRoot,sha256:match.sha256,
  bytes:expected.bytes,module:match.sourceModule,
  caveat:'Local archive byte integrity only; no actual device playback, Apple signing, or release authorization.'};
}

const thisFile=fileURLToPath(import.meta.url);
if(process.argv[1]&&path.resolve(process.argv[1])===thisFile){
 const mode=process.argv[2];
 (async()=>{
  if(mode==='prepare')return preparePrivateEasArchive();
  if(mode==='inspect')return inspectPrivateEasArchive({archiveRoot:process.argv[3]});
  throw Error('Usage: prepare | inspect <eas-build-inspect-output-directory>');
 })().then(value=>process.stdout.write(JSON.stringify(value,null,2)+'\n'))
   .catch(err=>{process.stderr.write(String(err?.message||err)+'\n');process.exitCode=1});
}
