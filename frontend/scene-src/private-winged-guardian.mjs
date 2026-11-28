// Private Guardian fit study. This is not a release asset receipt.
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

const WINGED_SHA='4a06b9a96e0ea6068394b9ccb1a2c74d61c455a94ddd201a935268309d4c961f';
const DONOR_SHA='057099cac71e04d6e1282b23fb52c9d593b8c1a4e055309254ca1f5609a42134';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function loadPrivateWingedGuardian(env=process.env,root){
  const internal = env.STAAR_WINGED_SIGNED_INTERNAL_REVIEW === '1';
  const localPath = env.STAAR_LOCAL_WINGED_GUARDIAN_QA_GLB;
  if(!internal && !localPath)return null;
  if(internal && (env.EAS_BUILD_PROFILE !== 'production' || env.STAAR_INTERNAL_TESTFLIGHT_GUARDIAN !== '1' ||
      env.STAAR_INTERNAL_HOME_REVIEW !== '1' || env.STAAR_PRIVATE_DEVICE_QA_BUILD === '1' || localPath || !root)){
    throw Error('The winged signed review requires the dedicated internal TestFlight build profile.');
  }
  if(!internal && (env.EAS_BUILD_PROFILE || env.CI || env.STAAR_INTERNAL_TESTFLIGHT_GUARDIAN || env.STAAR_PRIVATE_DEVICE_QA_BUILD)){
    throw Error('The winged Guardian fit test may only be bundled for local QA.');
  }
  const dir=internal?path.join(root,'assets','private-guardian-qa'):null;
  const bodyFile=internal?path.join(dir,'guardian-winged-review.glb'):localPath;
  const faceFile=internal?path.join(dir,'guardian-b250-iphone-qa.glb'):env.STAAR_LOCAL_GUARDIAN_FACE_QA_GLB;
  if(!faceFile)throw Error('Winged QA requires the exact face donor.');
  const [winged,donor]=await Promise.all([readFile(bodyFile),readFile(faceFile)]);
  if(digest(winged)!==WINGED_SHA || digest(donor)!==DONOR_SHA)throw Error('Unexpected local Guardian QA asset.');
  return {
    schema:'staar-winged-fit-v1', localOnly:!internal, sourceImageSha256:'d7f18158a91778a7f3ce97c7326b1c75afefdc792c77ab02c4fead0e3ffa659c',
    rigModelSha256:digest('staar-local-winged-fit-v1:'+WINGED_SHA+':'+DONOR_SHA),
    glbBase64:winged.toString('base64'), faceGlbBase64:internal?undefined:donor.toString('base64'),
    internalQaOnly:true, productionApproved:false, physicalIphoneCertified:false,
  };
}
