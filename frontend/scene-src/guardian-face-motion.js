/** Build 217 — facial pose playback for a separately owner-approved 16-viseme rig.
 * Merely having these shapes or this controller NEVER approves a model identity.
 * The caller must pass exact independently verified model/audio hashes and a
 * previously validated per-clip alignment to animate anything.
 */
export const FACE_TARGETS=Object.freeze(['rest','sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U']);
const isSha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function createApprovedGuardianFaceMotion(root,{rigSha256,expectedRigSha256}={}) {
 const meshes=[];
 if(root?.traverse)root.traverse(node=>{
   const dict=node?.morphTargetDictionary,influences=node?.morphTargetInfluences;
   if(!dict||!Array.isArray(influences)||!FACE_TARGETS.every(x=>
       Number.isInteger(dict[x])&&dict[x]>=0&&dict[x]<influences.length))return;
   meshes.push({influences,indices:FACE_TARGETS.map(k=>dict[k])});
 });
 const bound=isSha(rigSha256)&&rigSha256===expectedRigSha256&&meshes.length>0;
 let disposed=false;
 const reset=()=>{for(const mesh of meshes)
   for(const id of mesh.indices)mesh.influences[id]=0;};
 reset();
 const update=({audioSha256,expectedAudioSha256,playheadMs,durationMs,
   cues,playing=false,approvedAlignment=false}={})=>{
   reset();
   if(disposed||!bound||!playing||approvedAlignment!==true||!isSha(audioSha256)||
      audioSha256!==expectedAudioSha256||!Number.isFinite(playheadMs)||
      !Number.isFinite(durationMs)||durationMs<=0||durationMs>240000||
      playheadMs<0||playheadMs>=durationMs||!Array.isArray(cues)||cues.length>12000)
      return false;
   let lo=0,hi=cues.length-1,matched=-1,prev=-1;
   for(const c of cues){
     if(!c||!Number.isFinite(c.atMs)||c.atMs<0||c.atMs>durationMs||
       c.atMs<=prev||!FACE_TARGETS.includes(c.viseme)||
       !Number.isFinite(c.weight)||c.weight<0||c.weight>1) return false;
     prev=c.atMs;
   }
   while(lo<=hi){const mid=(lo+hi)>>1;
     if(cues[mid].atMs<=playheadMs){matched=mid;lo=mid+1;}else hi=mid-1;}
   if(matched<0)return true;
   const cue=cues[matched],target=FACE_TARGETS.indexOf(cue.viseme);
   const weight=(cue.viseme==='rest'||cue.viseme==='sil')?0:cue.weight;
   for(const mesh of meshes)mesh.influences[mesh.indices[target]]=weight;
   return true;
 };
 return {readyForPlayback:bound,meshCount:meshes.length,update,
   mute:reset,dispose(){disposed=true;reset();}};
}
