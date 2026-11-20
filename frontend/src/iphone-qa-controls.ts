/** Build 238 — local-only, fail-closed UI evidence boundary.
 * Renderer messages are untrusted even from our sandboxed WebView. These
 * helpers only whitelist bounded metrics and never certify a real iPhone.
 */
export type QaKind = 'guardian' | 'world';

export type QaSummary = {
  schema: 'staar-iphone-build238-local-qa-export-v1';
  kind: QaKind;
  scene: string;
  variant: string;
  session: string;
  capturedAt: string;
  platform: string;
  result: 'NO_APPROVED_ASSET'|'INSUFFICIENT_SAMPLES'|'REVIEW_REQUIRED';
  certification: 'UNVERIFIED';
  physicalIphoneOwnerAttestation: false;
  metrics: Record<string, string | number | boolean | null | string[]>;
};
const hex = (v:unknown):v is string => typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const validCount = (v:unknown,max=10000000):v is number =>
  typeof v==='number' && Number.isSafeInteger(v) && v>=0 && v<=max;
const validMetric = (v:unknown,max=10000000):v is number =>
  typeof v==='number' && Number.isFinite(v) && v>=0 && v<=max;
const object = (v:unknown):v is Record<string,unknown> =>
  !!v && typeof v==='object'&&!Array.isArray(v);
/** Match the actual GLB variant key, not the 'realm' host navigation default.
 * Only Relationships has a user-switchable 'singles' variant. Non-Relationships
 * scenes pass variant='realm' from WorldScene but load their own named GLB.
 */
export const resolveCanonicalWorldQaKey=(scene:string,variant:string):string|null=>{
 if(scene==='relationships')
   return variant==='realm'||variant==='singles'?'relationships-'+variant:null;
 if(variant!=='realm')return null;
 const canonical:Record<string,string>={
  home:'residence',work:'command',creativity:'dream',wellbeing:'health',
  events:'village',style:'closet',staarverse:'universe',staarsonic:'studio',
 };
 return Object.hasOwn(canonical,scene)?scene+'-'+canonical[scene]:null;
};
const isFalse=(v:unknown)=>v===false;
const keep=(src:Record<string,unknown>,dest:Record<string,string|number|boolean|null|string[]>,names:readonly string[],isValid:(v:unknown)=>boolean)=>{
  for(const name of names)if(isValid(src[name]))dest[name]=src[name] as number;
};
export function normalizeIphoneQa(
  kind: QaKind, payload: unknown,
  context:{scene:string;variant:string;session:string;platform:string;capturedAt:string},
):QaSummary|null {
  if(!object(payload)||!object(context)||
      !['guardian','world'].includes(kind)||
      typeof context.scene!=='string'||context.scene.length>40||
      typeof context.variant!=='string'||context.variant.length>24||
      typeof context.session!=='string'||context.session.length>128||
      !/^[a-zA-Z0-9:_-]+$/.test(context.session)||
      typeof context.platform!=='string'||context.platform.length>20||
      typeof context.capturedAt!=='string'||!Number.isFinite(Date.parse(context.capturedAt)))
    return null;
  const metrics:QaSummary['metrics']={};
  let result:QaSummary['result']='INSUFFICIENT_SAMPLES';
  if(kind==='guardian'){
    if(payload.schema!=='staar-guardian-physical-device-qa-telemetry-v1'||
       payload.decision!=='UNVERIFIED'||!isFalse(payload.physicalIphoneSessionCertified)||
       !isFalse(payload.externalLipSyncOffsetMeasured)||!isFalse(payload.finalLikenessApproved)||
       typeof payload.modelBound!=='boolean'||!validCount(payload.frameCount,1000000)||
       !validCount(payload.audioPacketCount,1000000)||
       !validCount(payload.acceptedAudioPacketCount,1000000)||
       payload.acceptedAudioPacketCount>payload.audioPacketCount)return null;
    if(payload.modelBound&&!hex(payload.modelSha256))return null;
    if(!payload.modelBound&&payload.modelSha256!==null)return null;
    metrics.modelBound=payload.modelBound;
    metrics.modelSha256=payload.modelBound?payload.modelSha256 as string:null;
    keep(payload,metrics,['frameCount','sampledFrameIntervals','renderFailures','audioPacketCount','acceptedAudioPacketCount','over50msFrameIntervals'],x=>validCount(x,1000000));
    keep(payload,metrics,['observedFps','elapsedMs','frameP50Ms','frameP95Ms','renderDurationP95Ms'],x=>validMetric(x,10000000));
    if(Array.isArray(payload.observedVisemes)&&payload.observedVisemes.length<=16&&
       payload.observedVisemes.every(x=>typeof x==='string'&&/^[A-Za-z]{1,4}$/.test(x)))
      metrics.observedVisemes=payload.observedVisemes;
    // Motion/neck readings are bounded scalar aggregates only. They never
    // prove visual collar contact or a real iPhone hardware session.
    if('neckPoseBound' in payload){
      if(typeof payload.neckPoseBound!=='boolean'||
         typeof payload.neckCollarPresent!=='boolean'||
         (payload.neckPoseBound&&!payload.modelBound)||
         !validCount(payload.neckPoseSamples,100000)||
         !validCount(payload.neckPoseFailures,100000)||
         (!payload.neckPoseBound&&payload.neckPoseSamples!==0)||
         !validMetric(payload.neckMaxPositiveGapUnits,100)||
         !validMetric(payload.neckMaxVerticalOverlapUnits,100)||
         !validMetric(payload.neckMaxHeadTranslationDriftUnits,100))return null;
      metrics.neckPoseBound=payload.neckPoseBound;
      metrics.neckCollarPresent=payload.neckCollarPresent;
      keep(payload,metrics,['neckPoseSamples','neckPoseFailures'],x=>validCount(x,100000));
      keep(payload,metrics,['neckMaxPositiveGapUnits','neckMaxVerticalOverlapUnits',
        'neckMaxHeadTranslationDriftUnits'],x=>validMetric(x,100));
    }
    if(!payload.modelBound)result='NO_APPROVED_ASSET';
    else if(payload.frameCount>=300&&validCount(payload.acceptedAudioPacketCount)&&payload.acceptedAudioPacketCount>0)
      result='REVIEW_REQUIRED';
  }else{
    if(payload.schema!=='staar-world-physical-device-qa-telemetry-v1'||
       payload.decision!=='UNVERIFIED')return null;
    // A world report may accurately say no asset has loaded, but may never
    // masquerade as a measured pass without a bound model SHA.
    const missing=payload.reason==='no_verified_world_model' && payload.worldKey===context.scene;
    if(!missing && (!hex(payload.modelSha256)||
       typeof payload.worldKey!=='string'||
       payload.worldKey!==resolveCanonicalWorldQaKey(context.scene,context.variant)||
       !isFalse(payload.realIphoneCertified)||
       !isFalse(payload.finalWorldOwnerApproved)||
       !isFalse(payload.physicsEngineCertified)||
       !isFalse(payload.actualPortalEndpointsCertified)||
       !validCount(payload.frameCount,1000000)||
       !validCount(payload.steps,1000000)||
       !validCount(payload.blockedSteps,1000000)||
       payload.blockedSteps>payload.steps ||
       typeof payload.routePreflightPassed!=='boolean' ||
       typeof payload.webglContextLost!=='boolean'))return null;
    if(missing){
      result='NO_APPROVED_ASSET';metrics.modelBound=false;
      metrics.reason='no_verified_world_model';
    }else{
      metrics.modelBound=true;metrics.modelSha256=payload.modelSha256 as string;
      metrics.worldKey=payload.worldKey as string;
      metrics.routePreflightPassed=payload.routePreflightPassed as boolean;
      metrics.webglContextLost=payload.webglContextLost as boolean;
      keep(payload,metrics,['frameCount','intervalCount','steps','blockedSteps','walkSteps','runSteps','groundTriangles','collisionTriangles'],x=>validCount(x,1000000));
      keep(payload,metrics,['distanceMeters','frameIntervalP95Ms'],x=>validMetric(x,10000000));
      if(validCount(payload.frameCount,1000000)&&payload.frameCount>=300&&
         validCount(payload.steps,1000000)&&payload.steps>=20&&payload.routePreflightPassed===true&&
         payload.webglContextLost===false)result='REVIEW_REQUIRED';
    }
  }
  return {
    schema:'staar-iphone-build238-local-qa-export-v1',
    kind,scene:context.scene,variant:context.variant,session:context.session,
    capturedAt:context.capturedAt,platform:context.platform,
    result,certification:'UNVERIFIED',physicalIphoneOwnerAttestation:false,
    metrics,
  };
}
export const iphoneQaStatus = (report:QaSummary|null):string => {
  if(!report)return 'No capture yet';
  if(report.result==='NO_APPROVED_ASSET')return 'No approved 3D asset loaded';
  if(report.result==='INSUFFICIENT_SAMPLES')return 'Insufficient test samples';
  return 'Captured for independent review — not certified';
};
