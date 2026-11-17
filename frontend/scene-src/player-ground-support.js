/** Build237 production-floor preflight for already-approved world meshes.
 * Only explicit staarCollisionRole='walkable' triangles may be passed in;
 * 'visual_only' and Build237 'walkable_candidate' are NOT authority.
 * Returns local geometry support evidence, never physical-device certification.
 */
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const failure=reason=>({ok:false,reason,triangleCount:0,supportAt:()=>({supported:false,reason}),routeSupported:()=>false});

export function createGroundSupportIndex(triangles,{maxTriangles=65000,minUpNormal=.82}={}){
 if(!Array.isArray(triangles)||triangles.length===0||triangles.length>maxTriangles||
    !finite(minUpNormal)||minUpNormal<=0||minUpNormal>1)return failure('invalid_ground_input');
 const ground=[];
 for(const tri of triangles){
  if(!Array.isArray(tri)||tri.length!==3||tri.some(p=>!Array.isArray(p)||p.length!==3||!p.every(finite)))
    return failure('corrupted_ground_triangle');
  const [a,b,c]=tri,ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2];
  const vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
  const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
  const normalLen=Math.hypot(nx,ny,nz);
  if(normalLen<1e-10||Math.abs(ny/normalLen)<minUpNormal)continue;
  const det=ux*vz-uz*vx;
  if(Math.abs(det)<1e-10)continue;
  ground.push({a,ux,uy,uz,vx,vy,vz,det,
    loX:Math.min(a[0],b[0],c[0]),hiX:Math.max(a[0],b[0],c[0]),
    loZ:Math.min(a[2],b[2],c[2]),hiZ:Math.max(a[2],b[2],c[2])});
 }
 if(!ground.length)return failure('no_walkable_surface_triangles');
 const yAt=(x,z,referenceFeet,maxRise)=>{
  let selected=null;
  for(const t of ground){
   if(x<t.loX-1e-7||x>t.hiX+1e-7||z<t.loZ-1e-7||z>t.hiZ+1e-7)continue;
   const dx=x-t.a[0],dz=z-t.a[2];
   const s=(dx*t.vz-dz*t.vx)/t.det, u=(t.ux*dz-t.uz*dx)/t.det;
   if(s< -1e-7||u< -1e-7||s+u>1+1e-7)continue;
   const height=t.a[1]+s*t.uy+u*t.vy;
   if(height>referenceFeet+maxRise+1e-7)continue;
   if(selected===null||height>selected)selected=height;
  }
  return selected;
 };
 function supportAt(point,{feet=0,maxDrop=.45,maxRise=.25,radius=.2}={}){
  if(!point||![point.x,point.z,feet,maxDrop,maxRise,radius].every(finite)||
    maxDrop<0||maxRise<0||maxDrop>2||maxRise>2||radius<0||radius>1)
    return {supported:false,reason:'invalid_support_query'};
  const offsets=[[0,0],[radius*.6,0],[-radius*.6,0],[0,radius*.6],[0,-radius*.6]];
  const heights=[];
  for(const [dx,dz] of offsets){
   const value=yAt(point.x+dx,point.z+dz,feet,maxRise);
   if(value===null)return {supported:false,reason:'ground_gap'};
   if(value<feet-maxDrop-1e-7)return {supported:false,reason:'ground_too_low'};
   heights.push(value);
  }
  const max=Math.max(...heights),min=Math.min(...heights);
  if(max-min>.20)return {supported:false,reason:'steep_or_split_floor'};
  return {supported:true,height:heights[0],heightSpread:max-min,reason:null};
 }
 function routeSupported(route,options={}){
  if(!Array.isArray(route)||route.length<2||route.length>1024)return false;
  let sampled=0,previous=null;
  const maxStep=options.maxStep??.20;
  if(!finite(maxStep)||maxStep<=0||maxStep>.25)return false;
  for(let k=1;k<route.length;k++){
   const p=route[k-1],q=route[k];
   if(!p||!q||![p.x,p.z,q.x,q.z].every(finite))return false;
   const delta=Math.hypot(q.x-p.x,q.z-p.z);
   const n=Math.max(1,Math.ceil(delta/maxStep));
   if(sampled+n>20000)return false;
   for(let i=(k===1?0:1);i<=n;i++){
    const r={x:p.x+(q.x-p.x)*i/n,z:p.z+(q.z-p.z)*i/n};
    const found=supportAt(r,options);
    if(!found.supported)return false;
    if(previous!==null&&Math.abs(found.height-previous)>.20)return false;
    previous=found.height;sampled++;
   }
  }
  return true;
 }
 return {ok:true,reason:null,triangleCount:ground.length,supportAt,routeSupported};
}
