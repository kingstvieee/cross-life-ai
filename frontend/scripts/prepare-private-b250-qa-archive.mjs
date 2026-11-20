/**
 * Private B250 iPhone-preview EAS archive rules.
 * This is deliberately distinct from production's locked two-file AAC rules.
 * No build, Apple signing, external upload or automated submission here.
 */
import {readFile,writeFile,chmod,realpath,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {generatePrivateEasIgnore,inspectPrivateEasArchive} from './prepare-private-eas-archive.mjs';
import {verifyApprovedSoundtrack} from './verify-approved-soundtrack.mjs';
import {verifyStagedNativeSource} from './stage-approved-startup-audio.mjs';
import {loadInternalGuardianQaAsset,B250_PRIVATE_RELATIVE_PATH,
  B250_PRIVATE_IPHONE_QA_SHA256} from '../scene-src/internal-guardian-qa.mjs';
import {LOCKED_STARTUP_SHA} from './verify-production-package.mjs';
const FRONTEND=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const REPO=path.resolve(FRONTEND,'..');
export const QA_PRIVATE_INCLUDE='frontend/'+ 'scene-src/'+B250_PRIVATE_RELATIVE_PATH;
const qaEnv={EAS_BUILD_PROFILE:'preview',STAAR_IPHONE_ONLY_QA:'1',
  EXPO_PUBLIC_GUARDIAN_DEVICE_QA:'1',EXPO_PUBLIC_WORLD_COLLISION_QA:'1'};

export function makePrivateB250QaIgnore(rootGitignore,frontendGitignore){
 const production=generatePrivateEasIgnore(rootGitignore,frontendGitignore);
 return production.trimEnd()+'\n'+
  '# Additional internal QA-only biometric GLB; NEVER use this ignore in production.\n'+
  '!frontend/scene-src/assets/private-guardian-qa/\n'+
  '!'+QA_PRIVATE_INCLUDE+'\n';
}
async function filmSha(frontend){
 const b=await readFile(path.join(frontend,'assets/videos/guardian-startup.mp4'));
 const hash=createHash('sha256').update(b).digest('hex');
 if(hash!==LOCKED_STARTUP_SHA)throw Error('private_b250_qa_locked_startup_film_mismatch');
 return hash;
}
export async function preparePrivateB250QaArchive({repoRoot=REPO,frontendRoot=path.join(repoRoot,'frontend')}={}){
 const [guardian,audio,native,film,rootIgnore,frontendIgnore]=await Promise.all([
  loadInternalGuardianQaAsset(path.join(frontendRoot,'scene-src'),{env:qaEnv}),
  verifyApprovedSoundtrack(frontendRoot),
  verifyStagedNativeSource(frontendRoot),
  filmSha(frontendRoot),
  readFile(path.join(repoRoot,'.gitignore'),'utf8'),
  readFile(path.join(frontendRoot,'.gitignore'),'utf8')
 ]);
 const expected=makePrivateB250QaIgnore(rootIgnore,frontendIgnore);
 const approvedAudioOnly=generatePrivateEasIgnore(rootIgnore,frontendIgnore);
 const target=path.join(repoRoot,'.easignore');
 const old=await readFile(target,'utf8').catch(e=>{if(e?.code==='ENOENT')return null;throw e;});
 if(old!==null&&old!==expected&&old!==approvedAudioOnly)
   throw Error('private_b250_qa_preexisting_upload_rules_unrecognized');
 if(old!==expected)await writeFile(target,expected,{mode:0o600});
 await chmod(target,0o600);
 return {schema:'staar-b250-private-iphone-eas-upload-rules-v1',
  exactB250Sha256:guardian.rigModelSha256,
  approvedAudioSha256:audio.sha256,approvedAudioModule:native.sourceModule,
  startupFilmSha256:film,previewOnly:true,noAppleSigningVerified:true,
  includePath:QA_PRIVATE_INCLUDE,easignoreSha256:createHash('sha256').update(expected).digest('hex'),
  next:'eas build:inspect --platform ios --profile preview --stage archive --output <fresh-inspect-dir>; then run this script inspect <fresh-inspect-dir>. Do NOT invoke any charged build or EAS submit before inspection.'};
}
export async function inspectPrivateB250QaArchive({archiveRoot,checkoutRoot=FRONTEND}={}){
 if(!archiveRoot||typeof archiveRoot!=='string')throw Error('private_b250_qa_inspection_dir_required');
 const inspected=await realpath(archiveRoot),checkout=await realpath(checkoutRoot);
 const contains=(a,b)=>b===a||b.startsWith(a+path.sep);
 if(contains(inspected,checkout)||contains(checkout,inspected))
   throw Error('private_b250_qa_archive_overlaps_checkout');
 const archivedAudio=await inspectPrivateEasArchive({archiveRoot,checkoutRoot});
 const roots=[path.join(inspected,'frontend'),inspected];
 for(const root of roots){
  try{
   const [qa,film]=await Promise.all([
    loadInternalGuardianQaAsset(path.join(root,'scene-src'),{env:qaEnv}),
    filmSha(root)
   ]);
   if(qa.rigModelSha256!==B250_PRIVATE_IPHONE_QA_SHA256)
     throw Error('private_b250_qa_invalid_archive_hash');
   return {schema:'staar-b250-private-eas-archive-inspection-v1',
    archiveVerified:true,guardianSha256:qa.rigModelSha256,
    approvedAudioSha256:archivedAudio.sha256,startupFilmSha256:film,
    productionReleaseApproved:false,physicalIphoneTested:false,AppleSignedIpaVerified:false};
  }catch(err){if(root===roots[roots.length-1])throw err;}
 }
 throw Error('private_b250_qa_archive_no_model');
}
const cli=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(cli){
 try{
  const mode=process.argv[2];
  const report=mode==='prepare'?await preparePrivateB250QaArchive():
    mode==='inspect'?await inspectPrivateB250QaArchive({archiveRoot:process.argv[3]}):
    (()=>{throw Error('Usage: prepare | inspect <actual-expo-inspected-directory>')})();
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
 }catch(e){process.stderr.write(String(e?.message||e)+'\n');process.exitCode=1;}
}
