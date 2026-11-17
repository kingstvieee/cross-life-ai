import {AnimationMixer,LoopOnce,LoopRepeat} from 'three';

/** Build236: clip-safe 3D body animation controller.
 * Only call after the production GLB loader's independent receipt validation;
 * approvedAsset is NOT itself an authentication/acceptance receipt.
 * Facial morph targets, jaw, lips, neck, and face-head rotations are NEVER driven.
 */
const BODY_PREFIX=/^B230_QA_Joint_(Pelvis|Spine|Chest|UpperArm_[LR]|Forearm_[LR]|Thigh_[LR]|Calf_[LR]|Foot_[LR])\.(position|quaternion)$/;
const NAMES=Object.freeze({
 walk:'WALK_IN_PLACE_BODY_QA',
 run:'RUN_IN_PLACE_BODY_QA',
 walkStart:'BUILD236_WALK_START_BODY_QA',
 walkStop:'BUILD236_WALK_STOP_BODY_QA',
 runStart:'BUILD236_RUN_START_BODY_QA',
 runStop:'BUILD236_RUN_STOP_BODY_QA',
});
const finite=x=>typeof x==='number'&&Number.isFinite(x);

export function createGuardianLocomotion(root, clips=[],{approvedAsset=false,reducedMotion=false}={}){
 const mixer=new AnimationMixer(root);
 const actions=new Map(),outgoing=[];
 let disposed=false,mode='idle',phase='idle',active=null,pending=null;
 if(approvedAsset===true&&!reducedMotion&&Array.isArray(clips)){
  for(const name of Object.values(NAMES)){
   const source=clips.find(c=>c?.name===name);
   if(!source || !finite(source.duration) || source.duration<=0 ||
      !Array.isArray(source.tracks) || source.tracks.length!==13 ||
      !source.tracks.every(t=>BODY_PREFIX.test(t.name)))continue;
   const clip=source.clone();
   actions.set(name,mixer.clipAction(clip));
  }
 }
 const ready=Object.values(NAMES).every(name=>actions.has(name));
 const start=(name,{loop=false}={})=>{
  const incoming=actions.get(name);if(!incoming)return false;
  if(active&&active!==incoming){active.fadeOut(.12);outgoing.push({action:active,seconds:.13});}
  incoming.reset();
  incoming.setLoop(loop?LoopRepeat:LoopOnce,loop?Infinity:1);
  incoming.clampWhenFinished=!loop;
  incoming.setEffectiveTimeScale(1);
  incoming.setEffectiveWeight(1);
  incoming.fadeIn(.12).play();
  active=incoming;phase=name;
  return true;
 };
 const onFinished=e=>{
  if(disposed||e.action!==active)return;
  if(pending){const name=pending;pending=null;start(name,{loop:true});}
  else if(mode==='idle'){active.stop();active=null;phase='idle';}
 };
 mixer.addEventListener('finished',onFinished);
 return {
  ready,
  setMode(next){
   if(disposed||!ready||!['idle','walk','run'].includes(next))return false;
   if(mode===next)return true;
   const previous=mode;mode=next;pending=null;
   if(next==='idle'){
    if(previous==='walk')start(NAMES.walkStop);
    else if(previous==='run')start(NAMES.runStop);
    else {active?.stop();active=null;phase='idle';}
   }else if(previous==='idle'){
    pending=NAMES[next];start(NAMES[next+'Start']);
   }else{
    // Direct walk/run crossfade avoids applying a rest-pose start clip
    // in the middle of a moving stride.
    start(NAMES[next],{loop:true});
   }
   return true;
  },
  update(deltaSeconds,visible=true){
   if(disposed||!visible||!finite(deltaSeconds)||deltaSeconds<=0)return;
   const dt=Math.min(deltaSeconds,.10);mixer.update(dt);
   for(let i=outgoing.length-1;i>=0;i--){
    outgoing[i].seconds-=dt;
    if(outgoing[i].seconds<=0){outgoing[i].action.stop();outgoing.splice(i,1);}
   }
  },
  snapshot:()=>({schema:'staar-guardian-build236-locomotion-private-qa-v1',ready,mode,phase,
    facialTracksDriven:false,assetReceiptInspectedByController:false,
    physicalIphoneMotionCertified:false,finalBodyArtApproved:false}),
  dispose(){
   if(disposed)return;
   disposed=true;pending=null;mode='idle';
   mixer.removeEventListener('finished',onFinished);
   mixer.stopAllAction();mixer.uncacheRoot(root);outgoing.length=0;
  }
 };
}
