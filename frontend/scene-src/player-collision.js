/** Build 215 — bounded 2-D swept capsule-footprint collision with axis sliding.
 * GLB's staarCollisionRole="solid" is the ONLY obstacle authority.
 * Geometry must be transformed into viewer coordinates before these functions run.
 * The capsule is approximated as a vertical cylinder; vertical intersection with
 * the avatar's height is checked by caller-supplied solid minY/maxY.
 * Offline GLB role tags are not equivalent to iPhone physics certification.
 */
export const WALK_RADIUS_M = 0.35;
export const WALK_HEIGHT_M = 1.70;
const finite = n => typeof n === 'number' && Number.isFinite(n);
const isPoint = p => p && finite(p.x) && finite(p.z);
const isSolid = b => b && ['minX','maxX','minZ','maxZ','minY','maxY']
  .every(k => finite(b[k])) && b.maxX>=b.minX && b.maxY>=b.minY && b.maxZ>=b.minZ;

export function capsuleCollidesXZ(point, boxes, options={}) {
  if (!isPoint(point) || !Array.isArray(boxes) || boxes.length>1024) return true;
  const radius=options.radius??WALK_RADIUS_M;
  const feet=options.feet??0;
  const height=options.height??WALK_HEIGHT_M;
  if(!finite(radius)||radius<=0||radius>2||!finite(feet)||!finite(height)||height<=0) return true;
  for(const b of boxes){
    if(!isSolid(b))return true; // fail closed if collider metadata is corrupted
    if(b.maxY<feet+0.08 || b.minY>feet+height)continue;
    const nearestX=Math.max(b.minX,Math.min(point.x,b.maxX));
    const nearestZ=Math.max(b.minZ,Math.min(point.z,b.maxZ));
    const dx=point.x-nearestX, dz=point.z-nearestZ;
    if(dx*dx+dz*dz < radius*radius) return true;
  }
  return false;
}

export function moveCapsuleXZ(current, displacement, solids, options={}) {
  if(!isPoint(current)||!isPoint(displacement)||!Array.isArray(solids)||solids.length>1024)
    return {point:current,blocked:true,reason:'invalid_inputs'};
  const stepLimit=options.maxStep??0.10;
  const maxDelta=options.maxDelta??0.60;
  const maxDistance=Math.hypot(displacement.x,displacement.z);
  if(!finite(stepLimit)||stepLimit<=0||stepLimit>0.25||
     !finite(maxDelta)||maxDelta<=0||maxDelta>3||maxDistance>maxDelta)
    return {point:{...current},blocked:true,reason:'invalid_step'};
  if(capsuleCollidesXZ(current,solids,options))
    return {point:{...current},blocked:true,reason:'spawn_overlaps_solid'};
  const iterations=Math.max(1,Math.ceil(maxDistance/stepLimit));
  let p={x:current.x,z:current.z},blocked=false;
  for(let i=0;i<iterations;i++){
    const dx=displacement.x/iterations,dz=displacement.z/iterations;
    const both={x:p.x+dx,z:p.z+dz};
    if(!capsuleCollidesXZ(both,solids,options)){p=both;continue;}
    // Axis slide, never tunnel through the larger movement diagonal.
    blocked=true;
    if(!capsuleCollidesXZ({x:p.x+dx,z:p.z},solids,options))p.x+=dx;
    if(!capsuleCollidesXZ({x:p.x,z:p.z+dz},solids,options))p.z+=dz;
  }
  return {point:p,blocked,reason:blocked?'solid_contact':null};
}

export function routeIsClear(points,solids,options={}) {
  if(!Array.isArray(points)||points.length<2||points.length>4096||
     !points.every(isPoint)) return false;
  for(let i=1;i<points.length;i++){
    const start=points[i-1],end=points[i];
    if(capsuleCollidesXZ(start,solids,options))return false;
    const vx=end.x-start.x,vz=end.z-start.z,steps=Math.ceil(Math.hypot(vx,vz)/0.08);
    if(steps>10000)return false;
    for(let j=1;j<=Math.max(1,steps);j++){
      const p={x:start.x+vx*j/Math.max(1,steps),z:start.z+vz*j/Math.max(1,steps)};
      if(capsuleCollidesXZ(p,solids,options))return false;
    }
  }
  return true;
}
