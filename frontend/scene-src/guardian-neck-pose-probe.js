import {Box3,Vector3} from 'three';

/** Internal-only, source-bound Three.js/WKWebView visual-seam instrumentation.
 * Measures the actual skinned face world bounds after each displayed gait pose,
 * rather than trusting a generic glTF importer screenshot.
 * No pixels, audio, identity images or arbitrary object metadata are exported.
 * Never declares iPhone, art, body-rig or Apple release acceptance.
 */
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const NAMES=Object.freeze({
 face:'GuardianContinuousHeadSkinned',
 neck:'B230_QA_Joint_Neck',
 head:'STAAR_Guardian_Head',
 gasket:'B244_NeckToCollar_BlackGasket_REVIEW_ONLY',
});
export function createGuardianNeckPoseProbe(root,{approvedAsset=false}={}){
 const found={};
 root?.traverse?.(node=>{
  for(const [key,name] of Object.entries(NAMES))if(node.name===name)
    (found[key]??=[]).push(node);
 });
 const face=found.face?.length===1?found.face[0]:null;
 const neck=found.neck?.length===1?found.neck[0]:null;
 const head=found.head?.length===1?found.head[0]:null;
 const gasket=found.gasket?.length===1?found.gasket[0]:null;
 const ready=approvedAsset===true&&!!root&&!!face?.isSkinnedMesh&&
   !!neck?.isBone&&!!head?.isBone&&head.parent===neck;
 const haveGasket=!!gasket?.isMesh&&gasket.parent===neck;
 let samples=0, failures=0,firstLocal=null,lastAt=null;
 let maxGap=0,maxOverlap=0,maxHeadDrift=0,disposed=false;
 const a=new Box3(),b=new Box3(),p=new Vector3();
 const reject=()=>{failures++;return false;};
 return {
  ready,hasGasket:haveGasket,
  sample(nowMs){
   if(disposed||!ready||!haveGasket||!finite(nowMs)||nowMs<0)return false;
   // Throttle potentially expensive CPU-skinned bounding boxes to 4 Hz.
   if(lastAt!==null&&nowMs-lastAt<250)return false;
   try{
    root.updateWorldMatrix(true,true);
    a.setFromObject(face,true);b.setFromObject(gasket,true);
    if(a.isEmpty()||b.isEmpty()||![a.min.y,a.max.y,b.min.y,b.max.y].every(finite))
      return reject();
    head.getWorldPosition(p);
    neck.worldToLocal(p);
    if(![p.x,p.y,p.z].every(finite))return reject();
    if(firstLocal===null)firstLocal=p.clone();
    maxHeadDrift=Math.max(maxHeadDrift,p.distanceTo(firstLocal));
    const vertical=a.min.y-b.max.y;
    maxGap=Math.max(maxGap,Math.max(0,vertical));
    maxOverlap=Math.max(maxOverlap,Math.max(0,-vertical));
    lastAt=nowMs;samples++;return true;
   }catch{return reject();}
  },
  snapshot(){return {
    neckPoseBound:ready&&!disposed,neckCollarPresent:haveGasket,
    neckPoseSamples:samples,neckPoseFailures:failures,
    neckMaxPositiveGapUnits:Math.round(maxGap*1000000)/1000000,
    neckMaxVerticalOverlapUnits:Math.round(maxOverlap*1000000)/1000000,
    neckMaxHeadTranslationDriftUnits:Math.round(maxHeadDrift*1000000)/1000000,
    physicalIphoneCertified:false,collarVisualApproved:false,
    neckQaDecision:'UNVERIFIED'
  };},
  dispose(){disposed=true;firstLocal=null;}
 };
}
