import {Box3, Group, Matrix4, Quaternion, Vector3} from 'three';
import {FACE_TARGETS} from './guardian-face-motion.js';
import {inspectGuardianRigIntegrity} from './guardian-rig-integrity.js';

export function mountPrivateSpeakingFace(winged,donor){
  if(!inspectGuardianRigIntegrity(donor).valid)throw Error('Face donor does not pass rig integrity');
  const head=winged.getObjectByName('STAAR_Guardian_Head');
  const original=[];
  const parts=[];
  winged.traverse(node=>{if(node.isSkinnedMesh&&node.material?.name==='Guardian_Head')original.push(node);});
  donor.traverse(node=>{
    if(node.isMesh && FACE_TARGETS.every(t=>Number.isInteger(node.morphTargetDictionary?.[t])))parts.push(node);
  });
  if(!head?.isBone || original.length!==1 || parts.length!==5)throw Error('Unexpected private rig layout');
  winged.updateMatrixWorld(true); donor.updateMatrixWorld(true);
  const face=donor.getObjectByName('GuardianContinuousHeadSkinned');
  const before=new Box3().setFromObject(face,true);
  const target=new Box3().setFromObject(original[0],true);
  const ratio=target.getSize(new Vector3()).divide(before.getSize(new Vector3())).toArray();
  const scale=ratio.sort((a,b)=>a-b)[1];
  if(!Number.isFinite(scale)||scale<=0)throw Error('Invalid private face bounds');
  const position=target.getCenter(new Vector3()).sub(before.getCenter(new Vector3()).multiplyScalar(scale));
  const mount=new Group(); mount.matrixAutoUpdate=false;
  mount.matrix.copy(head.matrixWorld.clone().invert().multiply(new Matrix4().makeScale(scale,scale,scale).setPosition(position)));
  const visible=new Set(parts);
  donor.traverse(node=>{
    if(node.isMesh)node.visible=visible.has(node);
    if(node.isBone)node.name='DonorQA_'+node.name;
  });
  original[0].visible=false;
  head.add(mount);mount.add(donor);
  winged.updateMatrixWorld(true);
  return donor;
}

export function createPrivateWingPose(root,clips){
  const names=['Guardian_Fly_Hover','Guardian_Land'];
  const axisNames=['Root','Mid','Tip'].flatMap(part=>['L','R'].map(side=>'STAAR_Wing_'+part+'_'+side));
  const targets=axisNames.map(name=>root.getObjectByName(name));
  if(!targets.every(node=>node?.isBone))throw Error('Missing wing joints');
  const states=names.map(name=>{
    const clip=clips.find(value=>value.name===name);
    if(!(clip?.duration>0))throw Error('Missing wing clip: '+name);
    const samplers=axisNames.map(joint=>clip.tracks.find(t=>t.name===joint+'.quaternion')?.createInterpolant());
    if(samplers.some(x=>!x))throw Error('Missing animated wing joint: '+name);
    return {clip,samplers};
  });
  const sampled=new Quaternion();
  const current=new Quaternion();
  return (landing,progress)=>{
    const state=states[landing?1:0];
    const t=Math.max(0,Math.min(1,progress))*state.clip.duration;
    for(const [i,target] of targets.entries()){
      sampled.fromArray(state.samplers[i].evaluate(t)).normalize();
      // Ease the first 15% of touchdown from the final hover orientation.
      if(landing && progress<.15){
        current.fromArray(states[0].samplers[i].evaluate(states[0].clip.duration)).normalize();
        sampled.slerp(current,1-Math.max(0,progress)/.15);
      }
      target.quaternion.copy(sampled);
    }
  };
}
