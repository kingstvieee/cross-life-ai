/** In-device 3D Guardian renderer measurement. Never asserts that an iPhone
 * was used or substitutes for external A/V sync and facial-identity acceptance.
 * Private telemetry only: no camera, face pixels, microphone or audio bytes.
 */
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
function percentile(samples,p){
  if(!samples.length)return null;
  const a=samples.slice().sort((x,y)=>x-y);
  return Math.round(a[Math.max(0,Math.ceil(p*a.length)-1)]*100)/100;
}
export function createGuardianDevicePerformanceProbe({maxSamples=3600}={}){
 if(!Number.isInteger(maxSamples)||maxSamples<30||maxSamples>36000)
   throw new Error('invalid_probe_sample_bound');
 let modelSha256=null,lastFrameAt=null,packetCount=0,acceptedPacketCount=0;
 let frameCount=0,renderFailures=0,firstAt=null,lastAt=null;
 const intervals=[],renderDurations=[],visemes=new Set();
 function modelReady(hash){
   if(!sha(hash))return false;
   modelSha256=hash;lastFrameAt=null;frameCount=0;renderFailures=0;
   packetCount=0;acceptedPacketCount=0;firstAt=null;lastAt=null;
   intervals.length=0;renderDurations.length=0;visemes.clear();
   return true;
 }
 function recordFrame(now,durationMs){
   if(!modelSha256||!finite(now)||!finite(durationMs))return;
   if(firstAt===null)firstAt=now;
   if(lastFrameAt!==null){
     const delta=now-lastFrameAt;
     if(finite(delta)&&delta<2500){
       intervals.push(delta);
       if(intervals.length>maxSamples)intervals.shift();
     }
   }
   lastFrameAt=now;lastAt=now;frameCount++;
   renderDurations.push(durationMs);
   if(renderDurations.length>maxSamples)renderDurations.shift();
 }
 function packet(frame,accepted){
   if(!modelSha256 || frame?.modelSha256!==modelSha256)return;
   packetCount++;
   if(!accepted)return;
   acceptedPacketCount++;
   if(Array.isArray(frame.cues) && finite(frame.playheadMs)){
     for(let i=frame.cues.length-1;i>=0;i--){
       const item=frame.cues[i];
       if(!finite(item.atMs)||item.atMs>frame.playheadMs)continue;
       if(typeof item.viseme==='string')visemes.add(item.viseme);
       break;
     }
   }
 }
 function failedFrame(){if(modelSha256)renderFailures++;}
 function snapshot(){
   const p95=percentile(intervals,.95);
   const elapsed=firstAt!==null&&lastAt!==null?lastAt-firstAt:null;
   return {
     schema:'staar-guardian-physical-device-qa-telemetry-v1',
     modelSha256,modelBound:Boolean(modelSha256),
     frameCount,sampledFrameIntervals:intervals.length,
     elapsedMs:elapsed===null?null:Math.max(0,Math.round(elapsed)),
     observedFps:elapsed&&elapsed>0&&frameCount>1
       ?Math.round(1000*(frameCount-1)/elapsed*100)/100:null,
     frameP50Ms:percentile(intervals,.5),
     frameP95Ms:p95,renderDurationP95Ms:percentile(renderDurations,.95),
     over50msFrameIntervals:intervals.filter(x=>x>50).length,
     renderFailures,
     audioPacketCount:packetCount,acceptedAudioPacketCount:acceptedPacketCount,
     observedVisemes:[...visemes].sort(),
     // Still requires a real iPhone export, external high-speed recording and
     // independent model-specific visual acceptance.
     physicalIphoneSessionCertified:false,
     externalLipSyncOffsetMeasured:false,
     finalLikenessApproved:false,
     decision:'UNVERIFIED',
   };
 }
 return {modelReady,recordFrame,packet,failedFrame,snapshot};
}
