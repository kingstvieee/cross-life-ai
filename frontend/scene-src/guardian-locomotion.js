import {AnimationMixer,LoopOnce,LoopRepeat} from 'three';

/** Build236: clip-safe 3D body animation controller.
 * Only call after the production GLB loader's independent receipt validation;
 * approvedAsset is NOT itself an authentication/acceptance receipt.
 * Facial morph targets, jaw, lips, neck, and face-head rotations are NEVER driven.
 */
// Reject superficially well-named clips that omit limbs, repeat tracks, or
// have malformed keyframes; renderer receipts alone do not validate motion.
const BODY_JOINTS=Object.freeze(['Pelvis','Spine','Chest','UpperArm_L','UpperArm_R',
 'Forearm_L','Forearm_R','Thigh_L','Thigh_R','Calf_L','Calf_R','Foot_L','Foot_R']);
const BODY_TRACK_SCHEMA=new Map(BODY_JOINTS.map(joint=>[
 'B230_QA_Joint_'+joint+(joint==='Pelvis'?'.position':'.quaternion'),
 joint==='Pelvis'?'vector':'quaternion',
]));
function validBodyClip(clip){
 if(!clip||!Number.isFinite(clip.duration)||clip.duration<=0||clip.duration>30||
    !Array.isArray(clip.tracks)||clip.tracks.length!==BODY_TRACK_SCHEMA.size)return false;
 const seen=new Set();
 for(const track of clip.tracks){
  if(!track||!BODY_TRACK_SCHEMA.has(track.name)||seen.has(track.name))return false;
  seen.add(track.name);
  const kind=BODY_TRACK_SCHEMA.get(track.name);
  if(track.ValueTypeName!==kind)return false;
  const size=kind==='quaternion'?4:3;
  const {times,values}=track;
  if(!times||!values||!Number.isSafeInteger(times.length)||
     times.length<2||times.length>3000||values.length!==times.length*size)return false;
  for(let i=0;i<times.length;i++){
   const time=times[i];
   if(!Number.isFinite(time)||time<0||time>clip.duration+.002||
      (i>0&&time<=times[i-1]))return false;
   let norm=0;
   for(let k=0;k<size;k++){
    const v=values[i*size+k];if(!Number.isFinite(v))return false;
    norm+=v*v;
   }
   if(kind==='quaternion'&&(norm<.9||norm>1.1))return false;
  }
 }
 return seen.size===BODY_TRACK_SCHEMA.size;
}
const NAMES=Object.freeze({
 walk:'WALK_IN_PLACE_BODY_QA',
 run:'RUN_IN_PLACE_BODY_QA',
 walkStart:'BUILD236_WALK_START_BODY_QA',
 walkStop:'BUILD236_WALK_STOP_BODY_QA',
 runStart:'BUILD236_RUN_START_BODY_QA',
 runStop:'BUILD236_RUN_STOP_BODY_QA',
});
const PORTAL_GESTURE='STAAR_PORTAL_OPEN_GESTURE_REVIEW';
const BREATH_CLIP='breathing';
function validBreathClip(clip){
 if(!clip||clip.name!==BREATH_CLIP||!Number.isFinite(clip.duration)||
   clip.duration<1||clip.duration>8||!Array.isArray(clip.tracks)||clip.tracks.length!==1)return false;
 const track=clip.tracks[0];
 if(track.name!=='B230_QA_Joint_Chest.scale'||track.ValueTypeName!=='vector'||
   !track.times||!track.values||track.times.length<3||track.times.length>120||
   track.values.length!==track.times.length*3)return false;
 for(let i=0;i<track.times.length;i++){
   if(!Number.isFinite(track.times[i])||track.times[i]<0||
      track.times[i]>clip.duration+.002||(i>0&&track.times[i]<=track.times[i-1]))return false;
   for(let k=0;k<3;k++){
     const v=track.values[i*3+k];
     if(!Number.isFinite(v)||v<.95||v>1.05)return false;
   }
 }
 return true;
}
const PORTAL_TRACKS=new Set(['UpperArm_R','Forearm_R','Chest'].map(joint=>
  'B230_QA_Joint_'+joint+'.quaternion'));
function validPortalGestureClip(clip){
 if(!clip||!Number.isFinite(clip.duration)||clip.duration<=0||clip.duration>5||
    !Array.isArray(clip.tracks)||clip.tracks.length!==PORTAL_TRACKS.size)return false;
 const seen=new Set();
 for(const track of clip.tracks){
  if(!PORTAL_TRACKS.has(track.name)||seen.has(track.name)||
     track.ValueTypeName!=='quaternion'||!track.times||!track.values||
     track.times.length<2||track.times.length>300||track.values.length!==track.times.length*4)return false;
  seen.add(track.name);
  for(let i=0;i<track.times.length;i++){
   if(!Number.isFinite(track.times[i])||track.times[i]<0||
     track.times[i]>clip.duration+.002||(i>0&&track.times[i]<=track.times[i-1]))return false;
   let norm=0;for(let j=0;j<4;j++){const x=track.values[i*4+j];
    if(!Number.isFinite(x))return false;norm+=x*x;}
   if(norm<.9||norm>1.1)return false;
  }
 }
 return seen.size===PORTAL_TRACKS.size;
}
const finite=x=>typeof x==='number'&&Number.isFinite(x);

export function createGuardianLocomotion(root, clips=[],{approvedAsset=false,reducedMotion=false}={}){
 const mixer=new AnimationMixer(root);
 const joints=new Map(BODY_JOINTS.map(j=>['B230_QA_Joint_'+j,0]));
 root.traverse(node=>{if(joints.has(node.name))joints.set(node.name,joints.get(node.name)+1);});
 const validSkeleton=[...joints.values()].every(count=>count===1);
 const actions=new Map(),outgoing=[];
 let disposed=false,mode='idle',phase='idle',active=null,pending=null,
   portalGesture=null,portalCallback=null,breathAction=null;
 if(approvedAsset===true&&!reducedMotion&&Array.isArray(clips)){
  for(const name of Object.values(NAMES)){
   const source=clips.find(c=>c?.name===name);
   if(!validSkeleton||!validBodyClip(source))continue;
   const clip=source.clone();
   actions.set(name,mixer.clipAction(clip));
  }
  const gestureClip=clips.find(c=>c?.name===PORTAL_GESTURE);
  if(validSkeleton&&validPortalGestureClip(gestureClip))
    portalGesture=mixer.clipAction(gestureClip.clone());
  if(portalGesture) actions.set(PORTAL_GESTURE,portalGesture);
  const breath=clips.find(c=>c?.name===BREATH_CLIP);
  if(validSkeleton&&validBreathClip(breath))breathAction=mixer.clipAction(breath.clone());
 }
 const ready=Object.values(NAMES).every(name=>actions.has(name));
 if(ready&&breathAction){
   // Non-conflicting chest scale channel. It does not replace the armour mesh,
   // mouth morph targets, face bones, or the walking/portal gesture rotations.
   breathAction.reset().setLoop(LoopRepeat,Infinity).play();
 }
 const start=(name,{loop=false}={})=>{
  const incoming=actions.get(name);if(!incoming)return false;
  // Build240: a quick walk→run→walk switch may reuse an action before an old
  // fade-out timer expires. Remove its stale stop request before reactivating.
  for(let i=outgoing.length-1;i>=0;i--){
   if(outgoing[i].action===incoming)outgoing.splice(i,1);
  }
  if(active&&active!==incoming){
   // Only one delayed stop can belong to an action at a time.
   for(let i=outgoing.length-1;i>=0;i--){
    if(outgoing[i].action===active)outgoing.splice(i,1);
   }
   active.fadeOut(.12);outgoing.push({action:active,seconds:.13});
  }
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
  if(e.action===portalGesture){
    const callback=portalCallback;portalCallback=null;
    active.stop();active=null;phase='idle';
    callback?.();return;
  }
  if(pending){const name=pending;pending=null;start(name,{loop:true});}
  else if(mode==='idle'){active.stop();active=null;phase='idle';}
 };
 mixer.addEventListener('finished',onFinished);
 return {
  ready,
  get breathingReady(){return ready&&Boolean(breathAction);},
  get gestureReady(){return ready&&Boolean(portalGesture);},
  /** A valid body-arm gesture runs before the portal navigation event. */
  openPortal(callback){
   if(disposed||!ready||!portalGesture||mode!=='idle'||portalCallback||
      typeof callback!=='function')return false;
   portalCallback=callback;
   if(!start(PORTAL_GESTURE)) {portalCallback=null;return false;}
   return true;
  },
  cancelPortal(){
   portalCallback=null;
   if(active===portalGesture){active.stop();active=null;phase='idle';}
  },
  setMode(next){
   if(disposed||!ready||!['idle','walk','run'].includes(next))return false;
   if(mode===next)return true;
   if(portalCallback){
     portalCallback=null;
     if(active===portalGesture){active.stop();active=null;}
   }
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
    physicalIphoneMotionCertified:false,finalBodyArtApproved:false,
    portalGestureAvailable:Boolean(portalGesture),breathingAvailable:Boolean(breathAction)}),
  dispose(){
   if(disposed)return;
   disposed=true;pending=null;portalCallback=null;mode='idle';
   mixer.removeEventListener('finished',onFinished);
   mixer.stopAllAction();mixer.uncacheRoot(root);outgoing.length=0;
  }
 };
}
