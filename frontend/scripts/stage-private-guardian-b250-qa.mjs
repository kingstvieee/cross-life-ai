/**
 * Owner-controlled local staging for a physical-iPhone Guardian B250 QA build.
 * Run ONLY in a private checkout. NEVER commit resulting file or release to App Store.
 * Input must be a direct exact GLB, not an extracted image/ZIP or generated stand-in.
 */
import {readFile,writeFile,mkdir,rename,chmod,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {B250_PRIVATE_RELATIVE_PATH,inspectInternalGuardianQaBytes,
  loadInternalGuardianQaAsset} from '../scene-src/internal-guardian-qa.mjs';
const FRONTEND=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function stagePrivateGuardianB250({inputFile,root=FRONTEND}={}){
 if(!inputFile||typeof inputFile!=='string')throw Error('private_guardian_input_glb_required');
 const bytes=await readFile(inputFile);
 const report=inspectInternalGuardianQaBytes(bytes);
 const out=path.join(root,'scene-src',B250_PRIVATE_RELATIVE_PATH);
 await mkdir(path.dirname(out),{recursive:true});
 const temp=out+'.staging-'+process.pid;
 try{
  await writeFile(temp,bytes,{mode:0o600});
  await rename(temp,out);
  await chmod(out,0o600);
 }finally{await rm(temp,{force:true});}
 return {mode:'OWNER_PRIVATE_DEVICE_QA_ONLY',stagedPath:out,
  modelSha256:report.rigModelSha256,byteLength:report.byteLength,
  noOwnerDeviceAcceptanceAsserted:true,noProductionReleaseAuthorized:true};
}
export async function verifyPrivateGuardianPreview({root=FRONTEND}={}){
 const model=await loadInternalGuardianQaAsset(path.join(root,'scene-src'),
  {env:{EAS_BUILD_PROFILE:'preview',STAAR_IPHONE_ONLY_QA:'1',
     EXPO_PUBLIC_GUARDIAN_DEVICE_QA:'1',EXPO_PUBLIC_WORLD_COLLISION_QA:'1'}});
 return {schema:'staar-b250-private-qa-source-preflight-v1',
  readyForInternalOwnerBuildApproval:true,exactB250Sha256:model.rigModelSha256,
  privateBytesPresent:true,sourcePreviewOnly:true,
  realIphoneTestCompleted:false,productionReleaseApproved:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const inputFile=process.argv[2];
 const result=inputFile?await stagePrivateGuardianB250({inputFile}):await verifyPrivateGuardianPreview();
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
