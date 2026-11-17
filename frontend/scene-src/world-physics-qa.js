/** Build237: locally sampled, session-bound world navigation QA.
 * This is inspectable evidence from a live render, not founder acceptance
 * or a signature proving execution on a physical iPhone.
 * No images, microphone, precise address or app credentials are recorded.
 */
const isHash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function createWorldPhysicsProbe({worldKey,modelSha256,maxFrames=1800}={}){
 if(typeof worldKey!=='string'||!/^[a-z-]+$/.test(worldKey)||
    !isHash(modelSha256)||!Number.isInteger(maxFrames)||maxFrames<60||maxFrames>12000)
    throw Error('invalid_world_qa_scope');
 let frameCount=0,steps=0,blockedSteps=0,walkSteps=0,runSteps=0,distanceM=0,lastFrame=null,intervals=[],groundTriangles=0,collisionTriangles=0;
 let routePreflightPassed=false,webglContextLost=false;
 return {
  navigationReady({groundTriangleCount,solidTriangleCount,routePassed}={}){
   if(Number.isInteger(groundTriangleCount)&&groundTriangleCount>=0)groundTriangles=groundTriangleCount;
   if(Number.isInteger(solidTriangleCount)&&solidTriangleCount>=0)collisionTriangles=solidTriangleCount;
   routePreflightPassed=routePassed===true;
  },
  movement({distance,blocked,running}={}){
   if(!finite(distance)||distance<0||distance>4)return;
   steps++;
   if(blocked===true)blockedSteps++;
   if(running===true)runSteps++;else walkSteps++;
   distanceM+=distance;
  },
  frame(now){
   if(!finite(now)||now<0)return;
   if(lastFrame!==null){
    const delta=now-lastFrame;
    if(delta>0&&delta<2500){intervals.push(delta);if(intervals.length>maxFrames)intervals.shift();}
   }
   lastFrame=now;frameCount++;
  },
  contextLost(){webglContextLost=true;},
  snapshot(){
   const sorted=intervals.slice().sort((a,b)=>a-b);
   const p95=sorted.length?sorted[Math.max(0,Math.ceil(sorted.length*.95)-1)]:null;
   return {schema:'staar-world-physical-device-qa-telemetry-v1',worldKey,modelSha256,
    frameCount,intervalCount:sorted.length,frameIntervalP95Ms:p95,
    steps,blockedSteps,walkSteps,runSteps,distanceMeters:Math.round(distanceM*1000)/1000,
    groundTriangles,collisionTriangles,routePreflightPassed,webglContextLost,
    actualPortalEndpointsCertified:false,physicsEngineCertified:false,
    realIphoneCertified:false,finalWorldOwnerApproved:false,decision:'UNVERIFIED'};
  }
 };
}
