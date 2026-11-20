import {Euler,Quaternion,Vector3} from 'three';

/** Build241: real approved-avatar-only 3D head focus, separated from body gait
 * and all 16 facial morph channels. The value approvedAsset must be supplied
 * only by the independently validated production asset loader.
 *
 * glTF body study authors in Z-up; the head's unrotated forward vector is -Y.
 * Clamp relative local yaw/pitch so the original face and armour remain intact.
 * This creates a preview motion controller, NOT device or owner certification.
 */
const RAD=Math.PI/180;
const MAX_YAW=22*RAD,MAX_PITCH=9*RAD;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const clamp=(x,lim)=>Math.max(-lim,Math.min(lim,x));
export function createGuardianHeadTracking(root,{approvedAsset=false,reducedMotion=false}={}){
 const matches=[],headBones=[];
 root?.traverse?.(node=>{
   if(node.name==='STAAR_Guardian_Head')matches.push(node);
   if(node.isSkinnedMesh && node.skeleton?.bones)for(const bone of node.skeleton.bones)
     if(bone.name==='STAAR_Guardian_Head')headBones.push(bone);
 });
 const head=matches.length===1&&matches[0].isBone&&headBones.includes(matches[0])?matches[0]:null;
 const base=head?.quaternion.clone()??null;
 const goal=base?.clone()??new Quaternion(), delta=new Quaternion();
 const euler=new Euler(0,0,0,'ZXY');
 const aim=new Vector3(), local=new Vector3(), world=new Vector3();
 let focused=false, disposed=false, yaw=0,pitch=0;
 const ready=approvedAsset===true&&!reducedMotion&&!!head&&!!head.parent;
 return {
  ready,
  setTargetWorld(point){
   if(!ready||disposed||!point||![point.x,point.y,point.z].every(finite)||
      Math.max(Math.abs(point.x),Math.abs(point.y),Math.abs(point.z))>10000)return false;
   head.parent.updateWorldMatrix(true,false);
   head.getWorldPosition(world);
   if(world.distanceToSquared(point)<.01)return false;
   local.copy(point);head.parent.worldToLocal(local);
   aim.copy(local).sub(head.position);
   if(aim.lengthSq()<.01)return false;
   // Require a forward direction; targets behind the character must not turn
   // the neck 180 degrees through the collar.
   if(aim.y>=-.05){focused=false;yaw=0;pitch=0;return false;}
   yaw=clamp(Math.atan2(aim.x,-aim.y),MAX_YAW);
   pitch=clamp(Math.atan2(aim.z,Math.hypot(aim.x,aim.y)),MAX_PITCH);
   euler.set(pitch,0,yaw,'ZXY');delta.setFromEuler(euler);
   goal.copy(base).multiply(delta);
   focused=true;return true;
  },
  clearTarget(){if(disposed)return;focused=false;yaw=0;pitch=0;goal.copy(base??new Quaternion());},
  update(seconds,visible=true){
   if(!ready||disposed||!visible||!finite(seconds)||seconds<=0)return;
   // Frame-rate independent, bounded smooth return; no wall-clock catch-up.
   const alpha=1-Math.exp(-Math.min(seconds,.1)/.16);
   head.quaternion.slerp(goal,alpha);
  },
  snapshot(){return {schema:'staar-guardian-build241-head-focus-qa-v1',
   ready:ready&&!disposed,focused,yawRadians:yaw,pitchRadians:pitch,
   approvedAssetReceiptInspectedByController:false,faceMorphsDriven:false,
   facialGeometryChanged:false,artistBodyMotionApproved:false,
   physicalIphoneAccepted:false};},
  dispose(){if(disposed)return;disposed=true;focused=false;
   if(head&&base)head.quaternion.copy(base);}
 };
}
