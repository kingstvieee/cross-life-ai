/** Build 234/235: XY capsule footprint against GLB solid triangles clipped to
 * the player's Y-height slab, with an exact 2D narrow phase and spatial hash.
 * Entirely local; it is not native-iPhone collision acceptance or a navmesh.
 * Input vertices are already transformed into Three.js world coordinates.
 */
const finite = v => typeof v === 'number' && Number.isFinite(v);
const failIndex = reason => ({ok:false, reason,triangleCount:0,footprintCount:0,gridCellCount:0,
  collides:()=>true});
function slabClip(points,bound,keepAbove) {
  const out=[];
  if(points.length<2)return out;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length];
    const insideA=keepAbove?a[1]>=bound-1e-8:a[1]<=bound+1e-8;
    const insideB=keepAbove?b[1]<=bound+1e-8:b[1]>=bound-1e-8;
    if(insideA)out.push(a);
    if(insideA!==insideB){
      const d=b[1]-a[1];if(Math.abs(d)<1e-10)continue;
      const alpha=(bound-a[1])/d;
      out.push([a[0]+alpha*(b[0]-a[0]),bound,a[2]+alpha*(b[2]-a[2])]);
    }
  }
  return out;
}
const sqSegment=(px,pz,ax,az,bx,bz)=>{
  const dx=bx-ax,dz=bz-az,len=dx*dx+dz*dz;
  const t=len<=1e-16?0:Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/len));
  return (px-ax-t*dx)**2+(pz-az-t*dz)**2;
};
function withinFootprint(px,pz,xy,radius) {
  let inside=false;let nearest=Infinity;
  let area2=0;
  for(let i=0,j=xy.length-1;i<xy.length;j=i++){
    const [ax,az]=xy[j], [bx,bz]=xy[i];
    area2 += ax*bz-bx*az;
    nearest=Math.min(nearest,sqSegment(px,pz,ax,az,bx,bz));
    if((az>pz)!==(bz>pz)){
      const crossing=ax+(bx-ax)*(pz-az)/(bz-az);
      if(px<crossing)inside=!inside;
    }
  }
  // Height-clipped vertical walls can project to collinear 3+ vertex chains.
  // Treat those as line segments, NEVER filled polygons.
  const safeRadius=Math.max(0,radius-1e-5); // 0.01 mm contact tolerance only
  return (Math.abs(area2)>1e-8 && inside)||nearest<safeRadius*safeRadius;
}
export function createTriangleCollisionIndex(triangles,{feet=0,height=1.7,cellSize=.5,maxTriangles=65000,maxCells=250000}={}) {
  if(!Array.isArray(triangles)||!triangles.length||triangles.length>maxTriangles||
     !finite(feet)||!finite(height)||height<=0||height>8||
     !finite(cellSize)||cellSize<.15||cellSize>2)return failIndex('invalid_input');
  const polygons=[],cells=new Map();let refs=0;
  const cell=(v)=>Math.floor(v/cellSize);
  for(const tri of triangles){
    if(!Array.isArray(tri)||tri.length!==3||tri.some(v=>!Array.isArray(v)||v.length!==3||!v.every(finite)))
      return failIndex('corrupted_vertex');
    const ys=tri.map(p=>p[1]);
    if(Math.max(...ys)<feet+.08||Math.min(...ys)>feet+height)continue;
    const clipped=slabClip(slabClip(tri,feet+.08,true),feet+height,false);
    const xy=[];
    for(const v of clipped)if(!xy.some(p=>Math.abs(p[0]-v[0])<1e-8&&Math.abs(p[1]-v[2])<1e-8))xy.push([v[0],v[2]]);
    if(xy.length<2)continue;
    const minX=Math.min(...xy.map(v=>v[0])),maxX=Math.max(...xy.map(v=>v[0]));
    const minZ=Math.min(...xy.map(v=>v[1])),maxZ=Math.max(...xy.map(v=>v[1]));
    if(![minX,maxX,minZ,maxZ].every(finite))return failIndex('corrupted_bounds');
    const id=polygons.length;polygons.push({xy,minX,maxX,minZ,maxZ});
    for(let ix=cell(minX);ix<=cell(maxX);ix++)for(let iz=cell(minZ);iz<=cell(maxZ);iz++){
      const key=ix+','+iz;const existing=cells.get(key);
      if(existing)existing.push(id);else cells.set(key,[id]);
      if(++refs>maxCells)return failIndex('excess_spatial_index');
    }
  }
  if(!polygons.length)return failIndex('no_solid_triangles_in_avatar_height');
  function collides(point,radius=.35){
    if(!point||!finite(point.x)||!finite(point.z)||!finite(radius)||radius<=0||radius>2)return true;
    const seen=new Set();
    for(let ix=cell(point.x-radius);ix<=cell(point.x+radius);ix++)for(let iz=cell(point.z-radius);iz<=cell(point.z+radius);iz++){
      const list=cells.get(ix+','+iz);if(!list)continue;
      for(const id of list){
        if(seen.has(id))continue;seen.add(id);
        const p=polygons[id];
        if(point.x+radius<p.minX||point.x-radius>p.maxX||point.z+radius<p.minZ||point.z-radius>p.maxZ)continue;
        if(withinFootprint(point.x,point.z,p.xy,radius))return true;
      }
    }
    return false;
  }
  return {ok:true,reason:null,triangleCount:triangles.length,footprintCount:polygons.length,gridCellCount:cells.size,collides};
}
