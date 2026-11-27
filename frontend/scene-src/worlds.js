import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createModelMotion, disposeModel } from './model-motion.js';
import {createGuardianLocomotion} from './guardian-locomotion.js';
import {createGuardianHeadTracking} from './guardian-head-tracking.js';
import {createGuardianIdle} from './guardian-idle.js';
import {inspectGuardianRigIntegrity} from './guardian-rig-integrity.js';
import {createWorldPhysicsProbe} from './world-physics-qa.js';
import { modelControls, hitControl } from './model-navigation.js';
import {moveCapsuleXZ, routeIsClear, WALK_RADIUS_M} from './player-collision.js';
import {createTriangleCollisionIndex} from './player-triangle-collision.js';
import {createGroundSupportIndex} from './player-ground-support.js';
import {createApprovedGuardianFaceMotion} from './guardian-face-motion.js';
import {applyGuardianSpeechFrame} from './guardian-speech-bridge.js';
import {createGuardianDevicePerformanceProbe} from './guardian-device-performance.js';
import {createPrivateWingPose,mountPrivateSpeakingFace} from './guardian-winged-fit.js';
import {createGuardianNeckPoseProbe} from './guardian-neck-pose-probe.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { worldIds, worldNames, fallbackActions } from './navigation.js';

// GLB textures must decode through <img> (the page's CSP allows blob: images) and
// never through fetch(), which that CSP blocks (no connect-src). three's GLTFLoader
// would pick its fetch-based ImageBitmapLoader on iOS 17+ and in WKWebView (no
// "Safari" user-agent token) and silently drop every embedded texture, including
// the Guardian's face atlas. This plugin swaps in the <img>-based TextureLoader.
const offlineGltfLoader = () => new GLTFLoader().register(parser => {
  parser.textureLoader = new T.TextureLoader(parser.options.manager);
  return {name: 'STAAR_offline_image_decoder'};
});

const ids = worldIds;
const names = worldNames;
const requested = window.STAAR_WORLD || new URLSearchParams(location.search).get('world') || 'hub';
const world = ['hub', ...ids].includes(requested) ? requested : 'hub';
const singles = world === 'relationships' && (window.STAAR_VARIANT || new URLSearchParams(location.search).get('variant')) === 'singles';
const guardianPresentation = world === 'hub' && window.STAAR_GUARDIAN_PRESENTATION === true;
if (guardianPresentation) {
  document.body.style.background = document.documentElement.style.background = 'transparent';
  document.querySelector('header').hidden = document.querySelector('footer').hidden = true;
  document.querySelector('header').style.display = document.querySelector('footer').style.display = 'none';
}
// The signed-in Home: a full-screen portal ring the React Native hub overlays
// with its own header and controls. The HTML chrome stays reachable for
// VoiceOver but is visually hidden while WebGL is healthy.
const immersiveHub = world === 'hub' && !guardianPresentation;
const reduced =window.STAAR_REDUCE_GUARDIAN_MOTION === true || matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.querySelector('canvas');
const session = window.STAAR_SCENE_SESSION || '';
const report = (type, data = {}) => {
  const event = { source: 'staar-scene-v1', world, session, type, ...data };
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(event));
  else parent.postMessage(event, '*');
};
const addNavigationFallback = () => {
  // A failed hub must show its accessible fallback controls again.
  document.body.classList.remove('hub-immersive');
  document.querySelector('#hub-caption')?.remove();
  const actions = document.querySelector('#actions');
  if (!actions) return;
  actions.replaceChildren();
  document.querySelector('footer').style.display='';
  for (const [label, action] of fallbackActions(world)) {
    const button = document.createElement('button');
    button.textContent = label;
    button.addEventListener('click', () => report('select', { action }));
    actions.append(button);
  }
};
let renderer;
try { renderer = new T.WebGLRenderer({ canvas, alpha: guardianPresentation, antialias: true, powerPreference: 'low-power' }); }
catch {
  document.querySelector('#status').textContent = '3D rendering is unavailable on this device. Navigation remains available below.';
  document.querySelector('#reset').hidden = true;
  addNavigationFallback();
  report('unavailable');
}
if (renderer) {
  const scene = new T.Scene();
  const bright = ['work','wellbeing','style'].includes(world);
  scene.background = new T.Color(bright ? '#c8dcec' : '#020611');
  if (guardianPresentation) scene.background = null;
  else if (immersiveHub) scene.fog = new T.Fog('#0b0a14', 34, 120);
  else scene.fog = new T.Fog(scene.background, 38, 150);
  // WKWebView can run this script before React Native has laid the web view out
  // (0x0 or a stale size). Measure the canvas box, keep CSS at 100% and resize
  // again from a ResizeObserver instead of trusting innerWidth once.
  const viewportSize = () => [
    Math.max(1, Math.round(canvas.clientWidth || innerWidth || document.documentElement.clientWidth || 1)),
    Math.max(1, Math.round(canvas.clientHeight || innerHeight || document.documentElement.clientHeight || 1)),
  ];
  let [viewWidth, viewHeight] = viewportSize();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, immersiveHub ? 2 : 1.5));
  renderer.setSize(viewWidth, viewHeight, false);
  // Hub: Khronos PBR Neutral keeps the skyline photo, portal artwork and brand colours
  // faithful (no hue shift) while still rolling off bright highlights for bloom.
  renderer.toneMapping = immersiveHub ? T.NeutralToneMapping : T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = immersiveHub ? 1 : 1.1;
  const env = immersiveHub ? hubEnvironment() : (() => {
    const room = new RoomEnvironment(), pmrem = new T.PMREMGenerator(renderer);
    const target = pmrem.fromScene(room, .04); room.dispose(); pmrem.dispose(); return target;
  })();
  scene.environment = env.texture;
  scene.add(new T.HemisphereLight('#d6edff', '#392818', immersiveHub ? .35 : bright ? 3 : 1.6));
  if (immersiveHub) scene.add(new T.AmbientLight('#cbd5ff', .45));
  for (const [color, intensity, position] of immersiveHub
    ? [['#ffe6c0',1.5,[6,15,9]],['#7cbcff',1.1,[-10,5,-5]]]
    : [['#fff3dc',4,[6,15,9]],['#5daeff',2,[-10,5,-5]]]) {
    const light = new T.DirectionalLight(color, intensity); light.position.set(...position); scene.add(light);
  }
  const camera = new T.PerspectiveCamera(48, viewWidth / viewHeight, .1, immersiveHub ? 700 : 180);
  camera.position.set(0,5.6,17);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0,2.2,-1); controls.enableDamping = !reduced;
  controls.minDistance = 3; controls.maxDistance = 28; controls.maxPolarAngle = Math.PI*.48;
  const animated = [], clickable = [], modelMotions = [];
  let disposed = false;
  let hubRig = null, hubStage = null, hubLoopReady = false, hubBloom = null;
  let guardianArrivalPending = false;
  let hubGuardianFlight = null; // immersive hub: {flight, guardian, active} once the Guardian model is mounted
  let importedControls = [];
  let walkController = null;
  let guardianFaceMotion = null;
  let mountedGuardianFaceSha256 = null;
  let guardianLocomotion = null;
  let guardianHeadTracking = null;
  let guardianNeckPoseQa = null;
  const worldQaEnabled=window.STAAR_WORLD_COLLISION_QA===true && world!=='hub';
  let worldPhysicsQa=null;
  const guardianDeviceQa = window.STAAR_GUARDIAN_QA === true && world === 'hub'
    ? createGuardianDevicePerformanceProbe() : null;
  // This does not create speech cues. Actual verified audio playback must supply
  // session-bound, timestamped cue packets. Unverified packets neutralize the face.
  const onHostFaceFrame=e=>{
    let packet=e?.data;
    if(typeof packet==='string'){try{packet=JSON.parse(packet);}catch{return;}}
    if(packet?.source==='staar-world-physics-qa-request-v1' &&
        packet.session===session && worldQaEnabled){
      report('world-physics-qa',{metrics:worldPhysicsQa?.snapshot()??{
        schema:'staar-world-physical-device-qa-telemetry-v1',worldKey:world,
        decision:'UNVERIFIED',reason:'no_verified_world_model'}});
      return;
    }
    if(packet?.source==='staar-guardian-locomotion-qa-command-v1' &&
        packet.session===session && window.STAAR_GUARDIAN_QA===true && world==='hub'){
      const accepted=guardianLocomotion?.setMode(packet.mode)===true;
      report('guardian-locomotion-qa',{accepted,mode:guardianLocomotion?.snapshot().mode??'idle',
        physicalIphoneMotionCertified:false});
      if(accepted)requestDraw();
      return;
    }
    if(packet?.source==='staar-guardian-device-qa-request-v1' &&
        packet.session===session && guardianDeviceQa){
      report('guardian-device-qa',{metrics:guardianDeviceQa.snapshot()});
      return;
    }
    if(!packet||packet.source!=='staar-native-guardian-audio-v1')return;
    const accepted=applyGuardianSpeechFrame(guardianFaceMotion,packet,{
      session,modelSha256:mountedGuardianFaceSha256,
    });
    guardianDeviceQa?.packet(packet,accepted);
    if(accepted)requestDraw();
  };
  window.addEventListener('message',onHostFaceFrame);

  // Only independently accepted production models can be loaded through the
  // approved asset gate. Review-only offline GLBs are never auto-mounted.
  function enableTaggedWalking(model, gltf, colliderScene=model) {
    // GLTFLoader does not necessarily copy asset-level extras to scene.userData.
    const nav=gltf?.parser?.json?.extras?.staarNavigationCandidate ||
      model.userData?.staarNavigationCandidate;
    const spawn=nav?.testedFreeStart||nav?.spawnFixture;
    if(!Array.isArray(spawn)||spawn.length!==2||spawn.some(n=>!Number.isFinite(n))||
      !Number.isFinite(nav?.capsuleRadiusM)||Math.abs(nav.capsuleRadiusM-WALK_RADIUS_M)>.01)
      return false;
    const solids=[];
    colliderScene.traverse(node=>{
      if(!node.isMesh || node.userData?.staarCollisionRole!=='solid')return;
      const bounds=new T.Box3().setFromObject(node);
      if(bounds.isEmpty())return;
      const b={minX:bounds.min.x,maxX:bounds.max.x,
        minZ:bounds.min.z,maxZ:bounds.max.z,
        minY:bounds.min.y,maxY:bounds.max.y};
      if(Object.values(b).every(Number.isFinite))solids.push(b);
    });
    if(!solids.length||solids.length>1024)return false;
    // Original Build 201/214 candidate routes were authored in GLB XY with Z-up.
    // Transform the authored fixture through the model matrix, never treat XY
    // floor coordinates as raw viewer XZ coordinates.
    model.updateMatrixWorld(true);
    const rawSpawn=new T.Vector3(spawn[0],spawn[1],0).applyMatrix4(model.matrixWorld);
    const scale=model.scale.x,feet=rawSpawn.y;
    const current={x:rawSpawn.x,z:rawSpawn.z};
    const params={feet,radius:WALK_RADIUS_M*scale,height:1.7*scale};
    // Exact triangle narrow phase: role-tagged meshes only, transformed by
    // real Three.js model matrices. Never silently fall back to AABB-only walking.
    // A missing, corrupt, or oversized collision index fails closed.
    const triangles=[],groundTriangles=[],p=new T.Vector3();
    let geometryInvalid=false;
    colliderScene.updateMatrixWorld(true);
    colliderScene.traverse(node=>{
      if(geometryInvalid || !node.isMesh)return;
      // Build237 'walkable_candidate' and 'visual_only' MUST NOT confer ground authority.
      const role=node.userData?.staarCollisionRole;
      if(role!=='solid'&&role!=='walkable')return;
      const pos=node.geometry?.getAttribute('position'),indices=node.geometry?.index;
      if(!pos || pos.itemSize!==3 || !Number.isInteger(pos.count) || pos.count<3){
        geometryInvalid=true;return;
      }
      const count=indices?indices.count:pos.count;
      if(count%3!==0 || count>195000 || triangles.length+groundTriangles.length+count/3>65000){
        geometryInvalid=true;return;
      }
      const vert=i=>{
        const index=indices?indices.getX(i):i;
        if(!Number.isInteger(index)||index<0||index>=pos.count){
          geometryInvalid=true;return [NaN,NaN,NaN];
        }
        p.fromBufferAttribute(pos,index).applyMatrix4(node.matrixWorld);
        return [p.x,p.y,p.z];
      };
      for(let k=0;k<count;k+=3){
        const tri=[vert(k),vert(k+1),vert(k+2)];
        if(geometryInvalid || tri.some(v=>!v.every(Number.isFinite))){
          geometryInvalid=true;return;
        }
        if(role==='solid')triangles.push(tri);else groundTriangles.push(tri);
      }
    });
    if(geometryInvalid || !triangles.length || !groundTriangles.length)return false;
    const collisionIndex=createTriangleCollisionIndex(triangles,{
      feet,height:params.height,cellSize:Math.max(.25,Math.min(1,.5*scale))
    });
    if(!collisionIndex.ok)return false;
    const groundIndex=createGroundSupportIndex(groundTriangles);
    if(!groundIndex.ok)return false;
    const groundOptions={feet,maxDrop:.3*scale,maxRise:.18*scale,radius:params.radius*.7};
    const collisionPredicate=point=>collisionIndex.collides(point,params.radius) ||
      !groundIndex.supportAt(point,groundOptions).supported;
    if(collisionPredicate(current))return false;
    // Renderer-space route must match the source GLB's reviewed path. Even an
    // otherwise walkable model fails closed when the authored portal route
    // contains a blocked segment or incorrect start metadata.
    const route=nav?.routePointsM;
    if(!Array.isArray(route)||route.length<2||route.length>1024 ||
       route.some(v=>!Array.isArray(v)||v.length!==2||!v.every(Number.isFinite)))return false;
    const transformedRoute=route.map(([x,y])=>{
      const v=new T.Vector3(x,y,0).applyMatrix4(model.matrixWorld);
      return {x:v.x,z:v.z};
    });
    if(Math.hypot(transformedRoute[0].x-current.x,transformedRoute[0].z-current.z)>.2*scale)
      return false;
    if(!routeIsClear(transformedRoute,solids,{...params,collisionPredicate}) ||
       !groundIndex.routeSupported(transformedRoute,groundOptions))return false;
    // A small navigation marker is not a replacement for the locked Guardian.
    const marker=new T.Mesh(new T.CylinderGeometry(.20,.20,.09,20),
      new T.MeshStandardMaterial({color:'#e9ce92',metalness:.9,roughness:.15,
      emissive:'#b28e55',emissiveIntensity:.45}));
    const initialGround=groundIndex.supportAt(current,groundOptions);
    if(!initialGround.supported)return false;
    marker.position.set(current.x,initialGround.height+.045*scale,current.z);
    scene.add(marker);
    const held=new Set();
    const directions={ArrowUp:'forward',KeyW:'forward',ArrowDown:'back',
      KeyS:'back',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
    const onDown=e=>{
      const key=e.code==='ShiftLeft'||e.code==='ShiftRight'?'run':directions[e.code];
      if(!key||e.metaKey||e.ctrlKey||e.altKey)return;
      held.add(key);e.preventDefault();requestDraw();};
    const onUp=e=>{
      const key=e.code==='ShiftLeft'||e.code==='ShiftRight'?'run':directions[e.code];
      if(key){held.delete(key);e.preventDefault();}};
    const onBlur=()=>held.clear();
    addEventListener('keydown',onDown);addEventListener('keyup',onUp);addEventListener('blur',onBlur);
    const pad=document.createElement('div');
    pad.setAttribute('role','group');pad.setAttribute('aria-label','Move through 3D world');
    pad.style.cssText='position:absolute;right:12px;bottom:90px;z-index:5;display:grid;grid-template-columns:repeat(3,44px);grid-template-rows:repeat(2,44px);gap:4px;touch-action:none';
    const add=(label,key,col,row)=>{
      const btn=document.createElement('button');btn.textContent=label;
      btn.setAttribute('aria-label','Walk '+key);btn.style.gridColumn=String(col);
      btn.style.gridRow=String(row);btn.style.touchAction='none';
      btn.addEventListener('pointerdown',e=>{e.preventDefault();held.add(key);requestDraw();});
      for(const eventName of ['pointerup','pointercancel','pointerleave'])
        btn.addEventListener(eventName,()=>held.delete(key));
      pad.append(btn);
    };
    add('↑','forward',2,1);add('←','left',1,2);add('↓','back',2,2);add('→','right',3,2);
    add('Run','run',1,1);
    document.body.append(pad);
    walkController={
      pressedCount:()=>held.size,
      tick(delta){
        if(!held.size||!Number.isFinite(delta)||delta<=0)return;
        const facing=controls.target.clone().sub(camera.position);facing.y=0;
        if(facing.lengthSq()<.0001)return;facing.normalize();
        const side=new T.Vector3(-facing.z,0,facing.x);
        let dx=0,dz=0;
        const f=(held.has('forward')?1:0)-(held.has('back')?1:0);
        const strafe=(held.has('right')?1:0)-(held.has('left')?1:0);
        dx=f*facing.x+strafe*side.x;dz=f*facing.z+strafe*side.z;
        const magnitude=Math.hypot(dx,dz);if(!magnitude)return;
        // Body animation selection remains separate: the approved 3D model must
        // actually have independently accepted locomotion clips before playback.
        const speed=(held.has('run')?3.65:1.65)*scale;
        const distance=Math.min(delta,.075)*speed;
        const result=moveCapsuleXZ(current,{x:dx/magnitude*distance,z:dz/magnitude*distance},solids,
          {...params,collisionPredicate,maxDelta:Math.max(.6,3*scale)});
        const shiftX=result.point.x-current.x,shiftZ=result.point.z-current.z;
        current.x=result.point.x;current.z=result.point.z;
        marker.position.x=current.x;marker.position.z=current.z;
        const grounded=groundIndex.supportAt(current,groundOptions);
        if(grounded.supported)marker.position.y=grounded.height+.045*scale;
        camera.position.x+=shiftX;camera.position.z+=shiftZ;
        controls.target.x+=shiftX;controls.target.z+=shiftZ;
        if(Math.abs(shiftX)+Math.abs(shiftZ)>.001)controls.update();
        worldPhysicsQa?.movement({distance:Math.hypot(shiftX,shiftZ),
          blocked:result.blocked,running:held.has('run')});
      },
      dispose(){
        held.clear();removeEventListener('keydown',onDown);
        removeEventListener('keyup',onUp);removeEventListener('blur',onBlur);
        pad.remove();scene.remove(marker);marker.geometry.dispose();marker.material.dispose();
      },
    };
    camera.position.set(current.x,feet+3.4*scale,current.z+6*scale);
    controls.target.set(current.x,feet+1.15*scale,current.z);
    controls.update();controls.saveState();
    worldPhysicsQa?.navigationReady({groundTriangleCount:groundIndex.triangleCount,
      solidTriangleCount:collisionIndex.triangleCount,routePassed:true});
    report('navigation-ready',{collisionMode:'tagged-triangle-capsule',
      solidMeshes:solids.length,solidTriangles:collisionIndex.triangleCount,
      collisionCells:collisionIndex.gridCellCount,
      walkableTriangles:groundIndex.triangleCount,
      groundGapGuardActive:true,offlineRouteVerifiedAgainstLoadedTriangles:true,
      actualPortalEndpointsCertified:false,deviceCertified:false});
    return true;
  }

  const material = (color,metalness=0,roughness=.4,emissive='#000000',emissiveIntensity=0) => new T.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity});
  const chrome = material('#c8d4e1',1,.16), gold = material('#cba15b',1,.22), black = material('#090f18',.75,.2), white = material('#f0ede6',.15,.55);
  const blue = material('#56c9ff',.3,.2,'#008aff',2), amber = material('#ffc377',.5,.2,'#ff861c',2), violet = material('#baaeff',.4,.2,'#7930ff',2), ruby = material('#8c1536',.2,.4), green = material('#345d3b',.05,.8);
  function mesh(geometry,mat,x=0,y=0,z=0,parent=scene) { const m = new T.Mesh(geometry,mat); m.position.set(x,y,z); parent.add(m); return m; }
  const box = (x,y,z,w,h,d,mat=chrome,parent=scene) => mesh(new T.BoxGeometry(w,h,d),mat,x,y,z,parent);
  const sphere = (x,y,z,r,mat=chrome,parent=scene) => mesh(new T.SphereGeometry(r,32,20),mat,x,y,z,parent);
  const cylinder = (x,y,z,r,h,mat=chrome,parent=scene) => mesh(new T.CylinderGeometry(r,r,h,48),mat,x,y,z,parent);
  function ring(x,y,z,r,tube,mat=chrome,flat=false,parent=scene) {const m=mesh(new T.TorusGeometry(r,tube,12,80),mat,x,y,z,parent);if(flat)m.rotation.x=Math.PI/2;return m;}
  function line(points,mat=blue,radius=.025,parent=scene) {return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),48,radius,8,false),mat,0,0,0,parent);}
  function text(label,x,y,z,width=3,parent=scene) {
    const c=document.createElement('canvas');c.width=1024;c.height=160;const ctx=c.getContext('2d');ctx.fillStyle='#edf4ff';ctx.font='500 56px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,512,80,980);
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
    return mesh(new T.PlaneGeometry(width,width*160/1024),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false}),x,y,z,parent);
  }
  function panel(label,action,x,y,z,accent=blue,width=3) {
    const g=new T.Group();g.position.set(x,y,z);scene.add(g);
    box(0,0,0,width,.8,.16,black,g);box(0,-.42,.02,width,.035,.2,accent,g);text(label,0,.02,.1,width*.92,g);
    g.userData={label,action};clickable.push(g);return g;
  }
  function floor(r=13,mat=black) {cylinder(0,-.25,0,r,.45,mat);for(let n=3;n<r;n+=3)ring(0,.01,0,n,.014,gold,true);ring(0,.02,0,r-.1,.045,chrome,true);}
  function plinth(x=0,z=0,r=2.7,accent=blue) {cylinder(x,.2,z,r,.4);cylinder(x,.45,z,r*.93,.15,black);ring(x,.55,z,r*.9,.035,accent,true);ring(x,.12,z,r,.035,gold,true);}
  function skyline(day=false) {
    for(let i=0;i<42;i++){const x=(i-21)*1.45,h=1.5+((i*17)%13)*.45,z=-30+Math.sin(i*7)*3;box(x,h/2,z,1.05,h,.9,day?chrome:black);for(let y=1;y<h;y+=.55)box(x,y,z+.46,.65,.045,.02,day?blue:amber);}
    cylinder(9,4,-30,.12,8);cylinder(9,7.5,-30,.7,.55);ring(9,7.6,-30,.7,.05,violet,true);cylinder(9,9.5,-30,.045,4);
    sphere(6,.3,-29,1.6).scale.y=.35;
  }
  function stars() {
    const p=[];for(let i=0;i<500;i++){const a=i*2.39996,r=25+i%34;p.push(Math.cos(a)*r,12+i%29,Math.sin(a)*r);}
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));const m=new T.Points(geometry,new T.PointsMaterial({color:'#e5eeff',size:.065}));scene.add(m);animated.push(t=>{if(!reduced)m.rotation.y=t*.002;});
  }
  function arch(x,z,r=2,accent=gold) {
    const g=new T.Group();g.position.set(x,0,z);scene.add(g);
    const points=new T.EllipseCurve(0,2.5,r,r,0,Math.PI,false).getPoints(48).map(p=>new T.Vector3(p.x,p.y,0));
    const path=new T.CatmullRomCurve3([new T.Vector3(r,0,0),...points,new T.Vector3(-r,0,0)]);
    mesh(new T.TubeGeometry(path,80,.15,12,false),chrome,0,0,0,g);mesh(new T.TubeGeometry(path,80,.035,8,false),accent,0,0,.17,g);return g;
  }
  function tree(x,z,mat=green,y=0,scale=1) {const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);scene.add(g);cylinder(0,.3,0,.4,.6,chrome,g);cylinder(0,1.4,0,.08,2,gold,g);for(let i=0;i<12;i++){const a=i*2.39996,r=.4+i%3*.18;sphere(Math.cos(a)*r,2.5+Math.sin(i*2)*.5,Math.sin(a)*r,.55,mat,g);}return g;}
  function waterfall(x,y,z,h=4) {for(let i=0;i<7;i++){const m=box(x+i*.12,y,z+Math.sin(i)*.08,.045,h,.035,blue);animated.push(t=>{m.scale.y=1+(reduced?0:Math.sin(t*2+i)*.035);});}}
  function diamond(x,y,z,size=.6) {const m=mesh(new T.OctahedronGeometry(size),chrome,x,y,z);animated.push(t=>{if(!reduced)m.rotation.y=t*.15;});return m;}
  function globe(x,y,z,r=1.6) {
    const g=new T.Group();g.position.set(x,y,z);scene.add(g);sphere(0,0,0,r,material('#06334c',.7,.2),g);
    for(let i=-3;i<=3;i++){const a=i*Math.PI/8;ring(0,Math.sin(a)*r,0,Math.cos(a)*r+.01,.012,blue,true,g);}
    for(let i=0;i<8;i++)ring(0,0,0,r+.015,.012,blue,false,g).rotation.y=i*Math.PI/8;
    for(let i=0;i<90;i++){const a=i*.32,l=Math.sin(i*1.7)*1.1;if(Math.sin(a*2)+Math.cos(l*3+a)<.2)continue;sphere(Math.cos(a)*Math.cos(l)*r,Math.sin(l)*r,Math.sin(a)*Math.cos(l)*r,.055,gold,g);}
    animated.push(t=>{if(!reduced)g.rotation.y=t*.06;});return g;
  }
  function shell(day=false) {floor(13,day?white:black);skyline(day);for(let i=-3;i<=3;i++){cylinder(i*3.6,3.6,-8,.13,7.2);box(i*3.6,3.6,-8,.04,7.2,.3,gold);}for(const r of[5.5,6,6.5]){ring(0,7.6,-1,r,.1,chrome,true);ring(0,7.49,-1,r-.15,.025,day?amber:blue,true);}for(const x of[-10,10]){tree(x,-5);tree(x,2);}}
  function sofa(x,z,a=0,mat=white) {const g=new T.Group();g.position.set(x,0,z);g.rotation.y=a;scene.add(g);box(0,.5,0,3.7,.55,1.25,mat,g);box(0,1.1,-.56,3.7,.9,.25,mat,g);for(const side of[-1,1])box(side*1.9,.85,0,.25,.8,1.4,mat,g);for(let i=-1;i<=1;i++)box(i*1.15,.82,.02,1.06,.12,1.05,mat,g);for(const x of[-1.5,1.5])for(const z of[-.4,.4])cylinder(x,.13,z,.06,.28,gold,g);return g;}
  function island(x,y,z,r=2,mat=green) {mesh(new T.ConeGeometry(r,r*1.6,7),black,x,y-r*.8,z);cylinder(x,y+.02,z,r,.15,mat);waterfall(x+r*.4,y-1.7,z+r*.6,3.5);}


  function approvedArmoredGuardian() {
    // The binary is bundled offline ONLY after build-time face/armour/signoff verification.
    // Without that file, the original Guardian remains the sole visible identity.
    // Separate private device-only route. This review model is explicitly
    // quarantined from the regular approved-asset importer and production
    // runtime; its real binary hash is checked by build.mjs at staging time.
    const internalHomeReview = window.STAAR_INTERNAL_HOME_REVIEW === true && Boolean(window.ReactNativeWebView);
    const internalQaRoute = !guardianPresentation && window.STAAR_GUARDIAN_QA === true;
    const internal=world==='hub' && (internalQaRoute || internalHomeReview) &&
      window.STAAR_PRIVATE_GUARDIAN_QA_MODEL?.schema==='staar-b250-private-internal-iphone-qa-v1' &&
      window.STAAR_PRIVATE_GUARDIAN_QA_MODEL?.internalQaOnly===true &&
      window.STAAR_PRIVATE_GUARDIAN_QA_MODEL?.productionApproved===false &&
      window.STAAR_PRIVATE_GUARDIAN_QA_MODEL?.physicalIphoneCertified===false
        ? window.STAAR_PRIVATE_GUARDIAN_QA_MODEL : null;
    const fit=window.STAAR_LOCAL_WINGED_GUARDIAN_QA;
    const wingedQa=world==='hub' && fit?.schema==='staar-winged-fit-v1' && fit.internalQaOnly===true &&
      fit.productionApproved===false && fit.physicalIphoneCertified===false &&
      (fit.localOnly===true ? window.STAAR_GUARDIAN_QA===true : fit.localOnly===false && Boolean(internal) && internalHomeReview)
      ? fit : null;
    const asset=wingedQa??internal??window.STAAR_APPROVED_GUARDIAN_MODEL;
    const unavailable = () => {
      if (disposed) return;
      if (guardianPresentation) report('guardian-unavailable');
      // Owner direction (24 Nov 2026): no placeholder shapes. Without a model the
      // hub keeps its pedestal, crown and light beam, and never shows a stand-in.
      if (immersiveHub && hubLoopReady) requestDraw();
    };
    if (!asset?.glbBase64 || asset.sourceImageSha256!=='d7f18158a91778a7f3ce97c7326b1c75afefdc792c77ab02c4fead0e3ffa659c') {
      // Never substitute a different person's image or a stand-in figure.
      unavailable(); return;
    }
    const parseLocalGlb=base64=>{
      const decoded=atob(base64);
      const bytes=new Uint8Array(decoded.length);
      for(let i=0;i<decoded.length;i++)bytes[i]=decoded.charCodeAt(i);
      return offlineGltfLoader().parseAsync(bytes.buffer,'');
    };
    let guardian, donor;
    parseLocalGlb(asset.glbBase64).then(async model=>{
        if(!model?.scene){unavailable();return;}
        guardian=model.scene;
        if(disposed){disposeModel(guardian);return;}
        let faceRoot=guardian, wingPose;
        if(wingedQa){
          donor=(await parseLocalGlb(wingedQa.faceGlbBase64??internal?.glbBase64)).scene;
          if(disposed){disposeModel(guardian);disposeModel(donor);return;}
          wingPose=createPrivateWingPose(guardian,model.animations);
          faceRoot=mountPrivateSpeakingFace(guardian,donor);
        }
        // Build242 repair acceptance: full-body neck must truly carry the protected
        // head skin. Do not show a frozen head, disable two-sided face rendering,
        // or retain zero-scale legacy silver/chrome armour in the live scene.
        const integrity=wingedQa?null:inspectGuardianRigIntegrity(guardian,{detachHiddenLegacy:true});
        if(integrity && !integrity.valid){disposeModel(guardian);unavailable();return;}
        // V4 private visual study only: retain the exact source GLB and its hash.
        // Correct the misleading pale titanium material values without touching the face,
        // skeleton, textures, animation clips or production-approved rendering path.
        if (internal && immersiveHub) {
          const palette = {
            B229_VARIANT_black_titanium_no_silver: [0x232832, .88, .27],
            B247_Layered_Forged_Chrome_CINEMATIC_CHROME: [0x252a33, .86, .25],
            B247_Titanium_Secondary_CINEMATIC_CHROME: [0x363d49, .82, .32],
            B229_mirror_chrome_armor: [0x292e37, .9, .22],
            B229_gold_light_trim: [0xcda650, .85, .25],
            B229_polished_gold: [0xd9b15d, .9, .24],
            B247_Laser_Gold_Channels_CINEMATIC_CHROME: [0xd5ac55, .9, .24],
            B247_Cinematic_Amber_Lightline_CINEMATIC_CHROME: [0xe5a44c, .55, .25],
          };
          const revised = new Map();
          guardian.traverse(node => {
            if (!node.isMesh || !node.material) return;
            const recolor = material => {
              if (!Object.prototype.hasOwnProperty.call(palette, material.name)) return material;
              if (revised.has(material)) return revised.get(material);
              const [color, metalness, roughness] = palette[material.name];
              const copy = material.clone();
              copy.color.setHex(color); copy.metalness = metalness; copy.roughness = roughness;
              if (copy.emissive) copy.emissive.multiplyScalar(.12);
              copy.envMapIntensity = .85; copy.needsUpdate = true;
              revised.set(material, copy); return copy;
            };
            node.material = Array.isArray(node.material) ? node.material.map(recolor) : recolor(node.material);
          });
        }

        // Preserve existing Y-up models and never guess an unspecified axis.
        const upAxis=model.parser?.json?.extras?.STAAR_Guardian_Coordinates?.upAxis;
        if(upAxis==='Z')guardian.rotation.x=-Math.PI/2;
        else if(upAxis && upAxis!=='Y'){disposeModel(guardian);unavailable();return;}
        const bounds=new T.Box3().setFromObject(guardian);
        const dimensions=bounds.getSize(new T.Vector3());
        if(!Number.isFinite(dimensions.y)||dimensions.y<=.01||dimensions.y>10000){disposeModel(guardian);unavailable();return;}
        const scale=Math.min((internal && immersiveHub ? 3.15 : 3.65)/dimensions.y,4.5/Math.max(dimensions.x,dimensions.z,.1));
        guardian.scale.setScalar(scale);
        // Centre approved full armour above the existing Guardian plinth, never crop the emblem.
        const centre=bounds.getCenter(new T.Vector3());
        guardian.position.set(-centre.x*scale,.6-bounds.min.y*scale,1.5-centre.z*scale);
        // Immersive hub: stand on the centre of the portal ring, feet on the stage top.
        if (immersiveHub) guardian.position.set(-centre.x*scale,HUB_STAGE_TOP-bounds.min.y*scale,-centre.z*scale);
        if (guardianPresentation) {
          const flight = new T.Group();
          scene.add(flight);
          flight.add(guardian);
          
          
          if (reduced) guardianArrivalPending = true;
          else {
            const arrivalPath = new T.CubicBezierCurve3(
              new T.Vector3(4.8, 4.9, -10),
              new T.Vector3(-1.4, 3.3, -7),
              new T.Vector3(-.85, -.35, -1.6),
              new T.Vector3(0, 0, 0),
            );
            const flightDuration = 2100;
            let startFlight;
            let arrived = false;
            let hoverStart;
            // Build the pose in Guardian's facing frame, independent of bone roll.
            flight.updateMatrixWorld(true);
            const flightJoints = [
              ['Chest', .12, 0, 0],
              ['UpperArm_L', -1.28, -.28, -.22], ['UpperArm_R', -.72, .55, .30],
              ['Forearm_L', -.20, 0, -.10], ['Forearm_R', -.42, 0, .16],
              ['Hand_L', .12, -.03, -.06], ['Hand_R', .18, .06, .10],
              ['Thigh_L', .20, 0, 0], ['Thigh_R', .29, 0, 0],
              ['Calf_L', -.23, 0, 0], ['Calf_R', -.31, 0, 0],
            ].flatMap(([name, pitch, spread, steer]) => {
              const joint = guardian.getObjectByName('B230_QA_Joint_' + name);
              if (!joint?.isBone) return [];
              const inverseRest = joint.getWorldQuaternion(new T.Quaternion()).invert();
              return [{ joint, pitch, spread, steer, rest: joint.quaternion.clone(),
                pitchAxis: new T.Vector3(1, 0, 0).applyQuaternion(inverseRest),
                spreadAxis: new T.Vector3(0, 0, 1).applyQuaternion(inverseRest) }];
            });
            const flightPose = new T.Quaternion();
            flight.position.copy(arrivalPath.v0);
            animated.push((time) => {
              startFlight ??= time;
              const progress = Math.min((time - startFlight) * 1000 / flightDuration, 1);
              const eased = progress * progress * (3 - 2 * progress);
              arrivalPath.getPoint(eased, flight.position);
              const bank = Math.sin(Math.PI * progress) * (1 - progress);
              flight.rotation.set(.16 * bank, -.32 * bank, .38 * bank);
              if (!arrived) {
                // Blend the live skeleton back into its standing pose as Guardian settles.
                const poseWeight = 1 - T.MathUtils.smoothstep(progress, .66, 1);
                const steering = Math.sin(progress * Math.PI * 2);
                for (const { joint, pitch, spread, steer, rest, pitchAxis, spreadAxis } of flightJoints) {
                  joint.quaternion.copy(rest);
                  joint.quaternion.multiply(flightPose.setFromAxisAngle(pitchAxis, pitch * poseWeight));
                  joint.quaternion.multiply(flightPose.setFromAxisAngle(
                    spreadAxis, (spread + steer * steering) * poseWeight,
                  ));
                }
              }
              
              if (progress < 1) return;
              if (!arrived) {
                arrived = true;
                hoverStart = time;
                guardianArrivalPending = true;
              }
              const hoverTime = time - hoverStart;
              const hoverBlend = Math.min(hoverTime, 1);
              flight.position.y = hoverBlend * .045 * Math.sin(hoverTime * 2.2);
              flight.rotation.y = hoverBlend * .035 * Math.sin(hoverTime * 1.1);
            });
          }
        } else if (immersiveHub && hubStage) {
          // In the hub the stage mount turns with the camera, so the Guardian keeps
          // facing the viewer. He flies in and lands on the pedestal (hubGuardianArrival).
          const flight = new T.Group(); hubStage.mount.add(flight); flight.add(guardian);
          hubGuardianFlight = {flight, guardian, active: !reduced, wingPose};
        } else {
          scene.add(guardian);
        }
        modelMotions.push(createModelMotion(guardian,model.animations,{guardian:true,reducedMotion:reduced}));
        // The internal branch is source-hash pinned but NEVER an Apple
        // release approval. The ordinary production branch still accepts
        // only the independent release-receipt-checked Guardian asset.
        guardianLocomotion=createGuardianLocomotion(guardian,model.animations,
          {approvedAsset:true,reducedMotion:reduced});
        modelMotions.push(guardianLocomotion);
        // The head controller is bound to the exact same release-gated GLB,
        // without any writes to the approved face meshes, jaw or viseme curves.
        guardianHeadTracking=createGuardianHeadTracking(guardian,
          {approvedAsset:true,reducedMotion:reduced});
        modelMotions.push(guardianHeadTracking);
        if (hubGuardianFlight) {
          // Breathing and weight shift whenever no clip or flight pose owns the body.
          const idle=createGuardianIdle(guardian,hubGuardianFlight.flight,{reducedMotion:reduced,
            busy:()=>hubGuardianFlight.active||guardianLocomotion?.snapshot().phase!=='idle'});
          modelMotions.push(idle);
          hubGuardianArrival();
        }
        guardianFaceMotion=createApprovedGuardianFaceMotion(faceRoot,{
          rigSha256:asset.rigModelSha256,expectedRigSha256:asset.rigModelSha256});
        // Only the exact build-time receipt-checked Guardian GLB can signal
        // readiness. 2D stills and the known rejected 3D models never do.
        guardianFaceMotion.mute();
        if(internal && guardianPresentation){
          document.querySelector('#title').textContent='GUARDIAN · PRIVATE IPHONE QA';
          document.querySelector('#status').textContent='REVIEW ONLY · NOT A RELEASED 3D GUARDIAN';
        }
        if(guardianFaceMotion.readyForPlayback){
          mountedGuardianFaceSha256=asset.rigModelSha256;
          guardianDeviceQa?.modelReady(asset.rigModelSha256);
          // Bind geometry diagnostics only inside the internal iPhone QA run.
          // A private review-only GLB still cannot pass the asset importer.
          if(guardianDeviceQa && !wingedQa)guardianNeckPoseQa=createGuardianNeckPoseProbe(guardian,
            {approvedAsset:true});
          report('guardian-face-ready',{modelSha256:asset.rigModelSha256});
        }
        if (guardianPresentation && !guardianFaceMotion.readyForPlayback) report('guardian-unavailable');
        requestDraw();
      }).catch(()=>{
        if(guardian){guardian.removeFromParent();disposeModel(guardian);}
        if(donor && !donor.parent)disposeModel(donor);
        unavailable();
      });
  }
  function hub() {
    if (guardianPresentation) {
      camera.position.set(0,3,9); controls.target.set(0,2.65,1.5);
      controls.enabled=false; approvedArmoredGuardian(); return;
    }
    // Immersive portal ring. OrbitControls stays off: the hub rig owns the camera.
    controls.enabled = false;
    const procedural = [hubSky(), hubStars(), ...hubSkyline()];
    const water = hubWater();
    hubPhotoBackdrop(procedural, water);
    const floorRef = hubPlatform();
    const cards = ids.some(id => typeof window.STAAR_PORTAL_ARTWORK?.[id] === 'string');
    const rings = {
      floor: hubEnergyRing(HUB_RING, .035, '#e9cf98', .022, .14, 30, .22),
      halo: hubEnergyRing(HUB_RING, cards ? HUB_CARD.lift + HUB_CARD.height + .75 : HUB_PORTAL.lift + HUB_PORTAL.h + HUB_PORTAL.rim + .8, '#fff0cc', .03, .17, 20, -.16),
    };
    if (cards) rings.halo.group.visible = false; // at card height it would slice the skyline at eye level
    else {
      const haloChrome = new T.Mesh(new T.TorusGeometry(HUB_RING + .26, .05, 10, 220), hubChrome);
      haloChrome.rotation.x = Math.PI / 2; haloChrome.position.y = rings.halo.group.position.y; scene.add(haloChrome);
    }
    hubStageBuild();
    hubBuildPortals(floorRef);
    hubBloom = createHubBloom();
    scene.add(hubMotes(520, 13, 9, '#f1e3c0', {rise: .16, size: .75}));
    approvedArmoredGuardian();
    hubFrame();
    const ui = hubInterface();
    hubRig = createHubRig(ui, floorRef, rings);
    ui.bind(hubRig);
    hubRig.update(0);
  }

  // ───────────────────────────── Immersive Portal Hub ─────────────────────────────
  // Ten portals float on a ring around the Guardian stage. Each portal is its
  // approved illustration (hub-art/*.webp) on a floating card over a chrome
  // pedestal; without a card it falls back to a procedural chrome arch. The
  // approved Toronto skyline photo is scene.background, pinned to the horizon.
  // The camera stays just inside the ring and always looks at the stage, so the
  // focused portal rises behind the Guardian while its neighbours peek in from the
  // screen edges. Swipe to turn the ring, tap a side portal to bring it round, tap
  // the centred portal (or its caption) to enter. Every animation is time-based and
  // collapses to static framing and instant moves under Reduce Motion.
  // Glow comes from additive shaders everywhere, plus a subtle UnrealBloom pass on
  // phone-sized screens (see createHubBloom).
  const HUB_RING = 10.6, HUB_STEP = Math.PI * 2 / ids.length;
  const HUB_CAM = {dist: 7.4, height: 5.4, lookY: 2.55, minDist: 6.3, maxDist: 8.8};
  const HUB_PORTAL = {w: 3.3, h: 4.7, rim: .24, lift: 1.12}; // procedural fallback arch
  const HUB_CARD = {height: 4.3, lift: 1.05, proxyWidth: 5.6};  // approved portal illustrations
  const HUB_STAGE_TOP = .6, HUB_INTRO_SECONDS = 3.6;
  const HUB_DOWNTOWN = Math.atan2(-.17, -1); // CN Tower bearing: just behind the first portal
  const HUB_FONT = '-apple-system, "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif';
  const HUB_ACCENTS = {
    home: ['#bfe6ff', '#f0d49a'], work: ['#46a8ff', '#a7e3ff'], creativity: ['#a47dff', '#ff9fe0'],
    wellbeing: ['#35dcc8', '#c6fbff'], relationships: ['#ff4878', '#ffc0a6'], events: ['#ffab45', '#b48cff'],
    style: ['#efe9df', '#c9d6ff'], staarverse: ['#cf63ff', '#5cd2ff'], staarsonic: ['#ffb347', '#ff6f3c'],
    diggitstaar: ['#76d4ff', '#f0d49a'],
  };
  const hubTime = {value: 2.4}, hubPointScale = {value: 700}, hubPixelRatio = {value: 1};
  const hubPortals = [], hubProxies = [];
  const hubChrome = new T.MeshStandardMaterial({color: '#e2e7ef', metalness: 1, roughness: .13, envMapIntensity: 1.25});
  const hubGold = new T.MeshStandardMaterial({color: '#d9ad63', metalness: 1, roughness: .2, envMapIntensity: 1.3});
  const hubGoldTrim = new T.MeshStandardMaterial({color: '#e4ba6e', metalness: 1, roughness: .16, emissive: '#5a3c12', emissiveIntensity: .4});
  const hubWrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const hubHash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const hubClamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const hubSmooth = (a, b, x) => { const k = hubClamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const hubEase = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const hubEaseOut = x => 1 - Math.pow(1 - x, 3);
  const hubAdditive = {transparent: true, depthWrite: false, blending: T.AdditiveBlending};
  const HUB_GLSL = `
    float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
    float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(hash12(i),hash12(i+vec2(1.,0.)),f.x),mix(hash12(i+vec2(0.,1.)),hash12(i+vec2(1.,1.)),f.x),f.y);}
    float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*vnoise(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return v;}
    float archSdf(vec2 p,float w,float h){float r=w*.5,cy=h-r;
      if(p.y>cy)return length(p-vec2(0.,cy))-r;return max(abs(p.x)-r,-p.y);}
  `;
  const HUB_VERTEX = `varying vec2 vPos;varying vec2 vUv;varying vec3 vWorld;varying vec3 vN;varying vec3 vV;
    void main(){vPos=position.xy;vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;
      vec4 mv=viewMatrix*w;vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
  // Hub shaders are authored in display (sRGB) colour. hubOutput converts to linear
  // and appends three's tone-mapping and colour-space chunks, so every hub material
  // looks the same drawn straight to the screen or through the bloom pipeline.
  const hubOutput = fragment => fragment.replace(/}\s*$/,
    'gl_FragColor.rgb=pow(max(gl_FragColor.rgb,vec3(0.)),vec3(2.2));\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}');
  const hubShader = (fragment, uniforms = {}, options = {}) => new T.ShaderMaterial({
    vertexShader: options.vertexShader || HUB_VERTEX, fragmentShader: hubOutput(HUB_GLSL + 'uniform float uTime;' + fragment),
    uniforms: {uTime: hubTime, ...uniforms}, ...(options.material || {}),
  });

  function hubEnvironment() {
    // Reflection environment for chrome and gold: night sky, warm Toronto horizon
    // and a few studio softboxes, prefiltered once with PMREM.
    const envScene = new T.Scene();
    envScene.add(new T.Mesh(new T.SphereGeometry(20, 32, 16), new T.ShaderMaterial({side: T.BackSide,
      vertexShader: 'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec3 vD;void main(){float y=vD.y;vec3 c=mix(vec3(.05,.055,.09),vec3(.008,.01,.02),smoothstep(0.,.9,y));'+
        'c+=vec3(.62,.46,.32)*exp(-abs(y)*10.);c+=vec3(.2,.2,.26)*exp(-abs(y-.18)*5.)*.6;c=mix(c,vec3(.02,.02,.03),smoothstep(0.,-.4,y));gl_FragColor=vec4(c,1.);}'})));
    for (const [w, h, color, gain, x, y, z] of [
      [9, 2.2, '#ffffff', 4.5, 0, 12, 2], [7, .7, '#ffd59a', 3.2, -10, 2.2, -6], [7, .7, '#ffd59a', 3.2, 10, 2.2, 6],
      [2.6, 5, '#d8eeff', 2.4, 11, 3, -4], [2.6, 5, '#ffffff', 2.0, -11, 3, 4], [14, .35, '#fff4dc', 3, 0, .6, -12],
      [5, 5, '#ffffff', 1.4, 0, 6, 12]]) {
      const softbox = new T.Mesh(new T.PlaneGeometry(w, h),
        new T.MeshBasicMaterial({color: new T.Color(color).multiplyScalar(gain), side: T.DoubleSide}));
      softbox.position.set(x, y, z); softbox.lookAt(0, 0, 0); envScene.add(softbox);
    }
    const generator = new T.PMREMGenerator(renderer), target = generator.fromScene(envScene, .02);
    generator.dispose();
    envScene.traverse(node => { node.geometry?.dispose(); node.material?.dispose(); });
    return target;
  }

  const hubBuffer = new T.Vector2();
  function hubFrame() {
    // Portrait phones are narrow: hold roughly 46° of horizontal view so the focused
    // portal, the Guardian and both neighbours fit, within a 50–80° vertical FOV.
    const fov = 2 * Math.atan(Math.tan(T.MathUtils.degToRad(46) / 2) / (camera.aspect || 1));
    camera.fov = hubClamp(T.MathUtils.radToDeg(fov), 50, 80);
    camera.updateProjectionMatrix();
    renderer.getDrawingBufferSize(hubBuffer);
    hubPointScale.value = hubBuffer.y / (2 * Math.tan(T.MathUtils.degToRad(camera.fov) / 2));
    hubPixelRatio.value = renderer.getPixelRatio();
  }

  function hubCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
  function hubTexture(c) {
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t;
  }
  function hubRoundRect(x, left, top, w, h, r) {
    x.beginPath(); x.moveTo(left + r, top);
    x.arcTo(left + w, top, left + w, top + h, r); x.arcTo(left + w, top + h, left, top + h, r);
    x.arcTo(left, top + h, left, top, r); x.arcTo(left, top, left + w, top, r); x.closePath();
  }
  // Canvas letterSpacing is missing on older iOS, so space glyphs by hand.
  function hubSpaced(x, label, cx, cy, spacing, draw = true) {
    const chars = [...label], widths = chars.map(ch => x.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    if (draw) { let px = cx - total / 2; chars.forEach((ch, i) => { x.fillText(ch, px, cy); px += widths[i] + spacing; }); }
    return total;
  }
  function hubNameplateTexture(label, accent) {
    const [c, x] = hubCanvas(1024, 208);
    hubRoundRect(x, 14, 14, 996, 180, 90);
    const fill = x.createLinearGradient(0, 14, 0, 194);
    fill.addColorStop(0, '#22262f'); fill.addColorStop(.45, '#0b0d12'); fill.addColorStop(1, '#14171e');
    x.fillStyle = fill; x.fill();
    const edge = x.createLinearGradient(14, 0, 1010, 0);
    ['#7f8898', '#ffffff', '#8a93a3', '#f2f5fa', '#7f8898'].forEach((s, i, a) => edge.addColorStop(i / (a.length - 1), s));
    x.lineWidth = 9; x.strokeStyle = edge; x.stroke();
    hubRoundRect(x, 30, 30, 964, 148, 74); x.lineWidth = 2.5; x.strokeStyle = 'rgba(226,190,120,.85)'; x.stroke();
    const text = label.toUpperCase(); let size = 76;
    do { x.font = `700 ${size}px ${HUB_FONT}`; size -= 2; } while (hubSpaced(x, text, 0, 0, 7, false) > 860 && size > 40);
    x.textBaseline = 'middle'; x.textAlign = 'left'; x.shadowColor = accent; x.shadowBlur = 24;
    const ink = x.createLinearGradient(0, 64, 0, 150); ink.addColorStop(0, '#ffffff'); ink.addColorStop(1, '#d5dbe6');
    x.fillStyle = ink; hubSpaced(x, text, 512, 108, 7);
    return hubTexture(c);
  }
  function hubCrownTexture() {
    const [c, x] = hubCanvas(512, 512);
    const bg = x.createRadialGradient(256, 256, 20, 256, 256, 256);
    bg.addColorStop(0, '#1b2334'); bg.addColorStop(.7, '#07090e'); bg.addColorStop(1, '#0b0d13');
    x.fillStyle = bg; x.beginPath(); x.arc(256, 256, 254, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(230,196,128,.9)'; x.lineWidth = 5; x.beginPath(); x.arc(256, 256, 236, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 2; x.beginPath(); x.arc(256, 256, 214, 0, Math.PI * 2); x.stroke();
    const goldInk = x.createLinearGradient(0, 170, 0, 350);
    goldInk.addColorStop(0, '#fff1c8'); goldInk.addColorStop(.5, '#e2b665'); goldInk.addColorStop(1, '#9c7232');
    x.fillStyle = goldInk; x.shadowColor = 'rgba(255,214,140,.8)'; x.shadowBlur = 24;
    x.beginPath(); x.moveTo(146, 318); x.lineTo(132, 214); x.lineTo(196, 262); x.lineTo(256, 176);
    x.lineTo(316, 262); x.lineTo(380, 214); x.lineTo(366, 318); x.closePath(); x.fill();
    x.fillRect(146, 328, 220, 22);
    x.shadowBlur = 0; x.fillStyle = '#ffffff';
    for (const [cx, cy, r] of [[132, 205, 10], [256, 165, 12], [380, 205, 10]]) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
    return hubTexture(c);
  }
  let hubGlowMap = null;
  function hubGlowSprite(color, scale, opacity = 1) {
    if (!hubGlowMap) {
      const [c, x] = hubCanvas(128, 128), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.18, 'rgba(255,255,255,.55)');
      g.addColorStop(.45, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128); hubGlowMap = hubTexture(c);
    }
    const sprite = new T.Sprite(new T.SpriteMaterial({map: hubGlowMap, color, opacity, ...hubAdditive, toneMapped: false}));
    sprite.scale.setScalar(scale); return sprite;
  }

  function hubSky() {
    const sky = new T.Mesh(new T.SphereGeometry(330, 48, 24), hubShader(`
      uniform vec2 uDowntown;varying vec3 vWorld;
      void main(){vec3 d=normalize(vWorld-cameraPosition);float el=d.y;
        float toward=pow(max(dot(normalize(d.xz+1e-4),uDowntown),0.),2.);
        vec3 col=mix(vec3(.034,.04,.088),vec3(.010,.013,.034),smoothstep(.04,.7,el));
        col+=mix(vec3(.15,.09,.2),vec3(.5,.28,.15),toward)*exp(-max(el,0.)*8.)*(.6+.5*toward);
        vec2 cu=d.xz/(max(el,0.)+.16)*1.25+vec2(uTime*.006,0.);
        float cloud=fbm(cu)*.75+fbm(cu*2.7+4.)*.25;
        float wisp=smoothstep(.5,.8,cloud)*smoothstep(-.01,.05,el)*(1.-smoothstep(.16,.4,el));
        col=mix(col,mix(vec3(.12,.08,.16),vec3(.62,.38,.22),toward),wisp*.5);
        float neb=fbm(d.xz/(el+.5)*1.7+9.)*smoothstep(.2,.75,el);
        col+=vec3(.07,.045,.14)*neb*neb*1.6;
        col=mix(col,vec3(.018,.02,.032),smoothstep(0.,-.08,el));
        gl_FragColor=vec4(col,1.);}`,
      {uDowntown: {value: new T.Vector2(Math.sin(HUB_DOWNTOWN), Math.cos(HUB_DOWNTOWN))}},
      {material: {side: T.BackSide, depthWrite: false}}));
    sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
    return sky;
  }

  function hubStars() {
    const count = 1600, position = new Float32Array(count * 3), seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const y = .03 + .97 * Math.pow(hubHash(i * 1.37), .85), az = hubHash(i * 3.11) * Math.PI * 2, r = Math.sqrt(1 - y * y) * 300;
      position.set([Math.sin(az) * r, y * 300, Math.cos(az) * r], i * 3); seed[i] = hubHash(i * 7.77) * 100;
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.BufferAttribute(position, 3));
    geometry.setAttribute('aSeed', new T.BufferAttribute(seed, 1));
    const starField = new T.Points(geometry, new T.ShaderMaterial({...hubAdditive, uniforms: {uTime: hubTime, uPR: hubPixelRatio},
      vertexShader: `attribute float aSeed;uniform float uTime,uPR;varying float vA;varying float vWarm;
        void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;
          float s=fract(aSeed*.731),big=step(.975,s);
          float tw=.62+.38*sin(uTime*(1.2+2.6*fract(aSeed*.37))+aSeed*6.);
          vA=(.32+.68*fract(aSeed*.191))*tw*smoothstep(.02,.18,normalize(position).y);vWarm=step(.6,fract(aSeed*.53));
          gl_PointSize=uPR*(1.+1.9*s*s+big*2.6);}`,
      fragmentShader: hubOutput(`varying float vA;varying float vWarm;
        void main(){float d=length(gl_PointCoord-.5);float g=smoothstep(.5,0.,d);g*=g;
          gl_FragColor=vec4(mix(vec3(.74,.82,1.),vec3(1.,.9,.78),vWarm)*g*vA,1.);}`)}));
    starField.renderOrder = -9; starField.frustumCulled = false; scene.add(starField);
    return starField;
  }

  function hubSkyline() {
    // One merged mesh (one draw call) for ~350 Toronto towers on a 360° horizon,
    // with procedural lit windows instead of hundreds of separate boxes.
    const position = [], windows = [], m = new T.Matrix4(), v = new T.Vector3();
    const addTower = (az, dist, w, h, d, seed) => {
      const box = new T.BoxGeometry(w, h, d), p = box.getAttribute('position'), n = box.getAttribute('normal'), index = box.index;
      m.makeRotationY(az).setPosition(Math.sin(az) * dist, -1.6 + h / 2, Math.cos(az) * dist);
      for (let k = 0; k < index.count; k++) {
        const i = index.getX(k);
        v.fromBufferAttribute(p, i).applyMatrix4(m); position.push(v.x, v.y, v.z);
        const roof = Math.abs(n.getY(i)) > .5;
        windows.push(roof ? -1 : Math.abs(n.getX(i)) > .5 ? p.getZ(i) + d / 2 : p.getX(i) + w / 2, p.getY(i) + h / 2, seed);
      }
      box.dispose();
    };
    for (let i = 0; i < 240; i++) {
      const az = i / 240 * Math.PI * 2 + (hubHash(i * 3.3) - .5) * .015;
      const core = Math.exp(-Math.pow(hubWrap(az - HUB_DOWNTOWN) / .38, 2));
      if (core < .1 && hubHash(i * 9.2) > .62) continue;
      const dist = 128 + hubHash(i * 7.7) * 34 - core * 10;
      const h = 1.6 + hubHash(i * 1.9) * (3 + core * 11) + (hubHash(i * 5.1) > .9 ? core * 6 : 0);
      addTower(az, dist, 2.4 + hubHash(i * 2.7) * 3, h, 2.4 + hubHash(i * 4.4) * 2.6, hubHash(i * 11.1));
      if (core > .25 && hubHash(i * 13.7) > .45) addTower(az + .004, dist + 9 + hubHash(i * 6.1) * 9,
        2.2 + hubHash(i * 8.3) * 2.6, h * (.55 + hubHash(i * 2.2) * .7), 2.8, hubHash(i * 17.3));
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(position, 3));
    geometry.setAttribute('aWin', new T.Float32BufferAttribute(windows, 3));
    const city = new T.Mesh(geometry, hubShader(`varying vec3 vWin;varying vec3 vWorld;
      void main(){vec3 col=vec3(.016,.019,.03);
        if(vWin.x>=0.){vec2 cell=vec2(vWin.x/.5,vWin.y/.62),id=floor(cell),f=fract(cell);
          float lit=step(.66,hash12(id+vWin.z*91.7))*step(.7,vWin.y);
          float shape=smoothstep(.12,.2,f.x)*smoothstep(.88,.8,f.x)*smoothstep(.16,.26,f.y)*smoothstep(.84,.74,f.y);
          vec3 tint=mix(vec3(1.,.76,.44),vec3(.6,.8,1.),step(.74,hash12(id*1.7+vWin.z*13.)));
          float flick=.82+.18*sin(uTime*(.4+hash12(id)*1.6)+hash12(id*3.1)*6.28);
          col+=tint*lit*shape*.5*flick;}
        float haze=smoothstep(110.,175.,length(vWorld.xz))*.4+(1.-smoothstep(-1.6,9.,vWorld.y))*.3;
        col=mix(col,vec3(.11,.075,.12),clamp(haze,0.,.75));
        gl_FragColor=vec4(col,1.);}`, {}, {vertexShader:
      'attribute vec3 aWin;varying vec3 vWin;varying vec3 vWorld;void main(){vWin=aWin;vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}'}));
    city.frustumCulled = false; scene.add(city);
    // CN Tower: a lathe silhouette with an animated LED pod and a blinking beacon.
    const tower = new T.Mesh(new T.LatheGeometry([[2.7,0],[2.1,3],[1.35,12],[1.02,24],[.95,28.2],[2.55,28.6],[2.85,29.6],[2.6,30.9],
      [1.15,31.4],[.72,33.5],[.64,35.6],[1.08,36.1],[1.08,37],[.52,37.4],[.24,38.2],[.15,46.5]].map(([r, y]) => new T.Vector2(r, y)), 28),
      hubShader(`varying vec3 vWorld;
        void main(){float y=(vWorld.y+1.6)/.62;vec3 col=vec3(.03,.034,.05);
          float pod=smoothstep(28.5,28.8,y)*(1.-smoothstep(30.8,31.1,y));
          col+=mix(vec3(.62,.36,1.),vec3(1.,.78,.42),.5+.5*sin(uTime*.35))*pod*(.55+.45*sin(y*7.-uTime*1.4))*.9;
          col+=vec3(1.,.86,.62)*smoothstep(36.,36.2,y)*(1.-smoothstep(36.9,37.1,y))*.7;
          col+=vec3(.55,.42,.9)*(1.-abs(fract(y*.14)-.5)*2.)*.035*step(y,28.);
          gl_FragColor=vec4(mix(col,vec3(.11,.075,.12),.3*(1.-smoothstep(0.,30.,y))),1.);}`));
    tower.scale.setScalar(.62); tower.position.set(Math.sin(HUB_DOWNTOWN) * 140, -1.6, Math.cos(HUB_DOWNTOWN) * 140); scene.add(tower);
    const beacon = hubGlowSprite('#ff3b3b', 2.4, .9); beacon.position.set(tower.position.x, 46.5 * .62 - 1.4, tower.position.z); scene.add(beacon);
    const podGlow = hubGlowSprite('#c9a2ff', 11, .3); podGlow.position.set(tower.position.x, 29.6 * .62 - 1.6, tower.position.z); scene.add(podGlow);
    animated.push(t => { beacon.material.opacity = reduced ? .8 : .25 + .75 * Math.pow(Math.max(0, Math.sin(t * 2.4)), 6); });
    // Rogers Centre dome beside the tower.
    const dome = new T.Mesh(new T.SphereGeometry(7.5, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), hubShader(`varying vec3 vWorld;varying vec3 vN;
      void main(){vec3 col=vec3(.035,.04,.058)+vec3(.9,.92,1.)*pow(1.-abs(vN.z),3.)*.05;
        col+=vec3(.95,.82,.62)*smoothstep(.05,0.,abs(vWorld.y+1.35))*.6;gl_FragColor=vec4(mix(col,vec3(.11,.075,.12),.35),1.);}`));
    dome.scale.set(.75, .32, .75); dome.position.set(Math.sin(HUB_DOWNTOWN + .07) * 134, -1.6, Math.cos(HUB_DOWNTOWN + .07) * 134); scene.add(dome);
    return [city, tower, beacon, podGlow, dome];
  }

  function hubWater() {
    // Lake Ontario. Procedural mode: shimmering columns of skyline light and the CN
    // Tower's reflection. Photo mode (uPhoto=1): a calm, rotation-independent shimmer
    // whose far water turns transparent, so the skyline photo's own lake shows at the
    // horizon and the 3D lake and the photo meet without a seam.
    const material = hubShader(`uniform vec2 uDowntown;uniform float uTowerAz,uPhoto;varying vec3 vWorld;
      void main(){vec3 toP=vWorld-cameraPosition;float dist=length(toP.xz);
        float toward=pow(max(dot(normalize(vWorld.xz+1e-4),uDowntown),0.),3.)*(1.-uPhoto);
        vec3 col=mix(vec3(.008,.013,.026),vec3(.09,.065,.1),smoothstep(25.,300.,dist));
        col+=vec3(.42,.24,.13)*toward*smoothstep(50.,320.,dist)*.35;
        float azc=atan(toP.x,toP.z);float cell=floor(azc*240.);
        float lit=step(mix(.82,.42,toward),hash12(vec2(cell,3.7)))*(1.-uPhoto);
        float rip=vnoise(vec2(vWorld.x*1.1+vWorld.z*.3,dist*1.6-uTime*1.3))*vnoise(vec2(azc*900.,dist*.35+uTime*.4));
        vec3 tint=mix(vec3(1.,.7,.4),vec3(.62,.8,1.),step(.8,hash12(vec2(cell,9.1))));
        col+=tint*lit*smoothstep(.22,.55,rip)*smoothstep(16.,70.,dist)*.38;
        float ad=abs(atan(sin(azc-uTowerAz),cos(azc-uTowerAz)));
        col+=vec3(.75,.55,1.)*exp(-ad*ad*9000.)*smoothstep(.3,.7,rip+.3)*smoothstep(30.,110.,dist)*.5*(1.-uPhoto);
        float calm=vnoise(vec2(dist*.9-uTime*.5,vWorld.y))*vnoise(vec2(length(vWorld.xz)*2.1+uTime*.3,3.));
        col+=vec3(.55,.42,.5)*smoothstep(.3,.6,calm)*smoothstep(16.,60.,dist)*.14*uPhoto;
        float alpha=1.-uPhoto*smoothstep(38.,150.,dist);
        gl_FragColor=vec4(col,alpha);}`,
      {uDowntown: {value: new T.Vector2(Math.sin(HUB_DOWNTOWN), Math.cos(HUB_DOWNTOWN))}, uTowerAz: {value: HUB_DOWNTOWN}, uPhoto: {value: 0}},
      {material: {transparent: true, depthWrite: false}});
    const water = new T.Mesh(new T.CircleGeometry(420, 96), material);
    water.rotation.x = -Math.PI / 2; water.position.y = -1.6; water.renderOrder = -5; scene.add(water);
    return material;
  }

  // Backdrop with the locked homepage's look (hub-art/cosmic-skyline.webp): moon,
  // spiral galaxy and starfield over the night Toronto skyline and lake. It is
  // scene.background, stays put while the ring turns (a carousel in front of the
  // city) and is re-pinned to the horizon every frame, so its waterline meets the
  // 3D lake during the fly-in and when the viewer looks up or down. Falls back to
  // the procedural city if it is missing or fails to decode.
  const HUB_SKYLINE = {waterline: .777, above: 23.2, centre: .525}; // waterline row (from top), degrees of sky above it, framing (moon, CN Tower, galaxy)
  let hubBackdrop = null;
  function hubPhotoBackdrop(procedural, water) {
    const src = window.STAAR_HUB_SKYLINE;
    const fallback = () => { hubBackdrop = null; scene.background = new T.Color('#020611'); procedural.forEach(o => { o.visible = true; }); water.uniforms.uPhoto.value = 0; if (hubLoopReady) requestDraw(); };
    if (typeof src !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(src)) return false;
    procedural.forEach(o => { o.visible = false; });
    scene.background = new T.Color('#140f1f'); // dusk tone for the instant before the photo decodes
    water.uniforms.uPhoto.value = 1;
    hubBackdrop = {ready: false, texture: null};
    hubBackdrop.texture = new T.TextureLoader().load(src, texture => {
      if (disposed || !hubBackdrop) { texture.dispose(); return; }
      texture.colorSpace = T.SRGBColorSpace;
      texture.wrapS = T.MirroredRepeatWrapping; texture.wrapT = T.ClampToEdgeWrapping; // wide screens mirror, never smear
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      scene.background = texture; hubBackdrop.ready = true;
      hubAlignBackdrop(); if (hubLoopReady) requestDraw();
    }, undefined, fallback);
    return true;
  }
  const hubProbe = new T.Vector3(), hubAhead = new T.Vector3();
  function hubAlignBackdrop() {
    if (!hubBackdrop?.ready) return;
    const texture = hubBackdrop.texture, image = texture.image;
    if (!image?.width) return;
    camera.updateMatrixWorld();
    camera.getWorldDirection(hubAhead); hubAhead.y = 0;
    if (hubAhead.lengthSq() < 1e-6) hubAhead.set(0, 0, -1);
    hubAhead.normalize();
    const screenY = lift => {
      hubProbe.copy(camera.position).addScaledVector(hubAhead, 1000); hubProbe.y += lift;
      return (hubProbe.project(camera).y + 1) / 2;
    };
    const horizon = screenY(0), top = screenY(1000 * Math.tan(T.MathUtils.degToRad(HUB_SKYLINE.above)));
    const kv = HUB_SKYLINE.waterline / Math.max(.02, top - horizon);
    const ku = kv * (camera.aspect || 1) / (image.width / image.height);
    texture.repeat.set(ku, kv);
    texture.offset.set(HUB_SKYLINE.centre - ku / 2, (1 - HUB_SKYLINE.waterline) - horizon * kv);
  }

  function hubPlatform() {
    // Obsidian floor: concentric gold rings round the pedestal and a soft light pool
    // under each portal that brightens with focus. No radial lines.
    const portalPos = Array.from({length: ids.length}, () => new T.Vector3());
    const portalCol = ids.map(id => new T.Color((HUB_ACCENTS[id] || ['#bfe6ff'])[0]));
    const floorMesh = new T.Mesh(new T.CircleGeometry(13.6, 160), hubShader(`uniform vec3 uPortal[10];uniform vec3 uPortalCol[10];uniform float uRing;varying vec3 vWorld;
      float ringLine(float x,float w){float fw=fwidth(x);return 1.-smoothstep(w-fw,w+fw,abs(x));}
      void main(){vec2 p=vWorld.xz;float r=length(p);
        vec3 col=mix(vec3(.034,.038,.052),vec3(.012,.013,.019),smoothstep(0.,13.,r));
        col+=(vnoise(p*1.6)-.5)*.014+(vnoise(p*7.)-.5)*.006;
        col+=vec3(.38,.62,.9)*exp(-r*r*.16)*.2;
        vec3 gold=vec3(.86,.67,.37);
        col+=gold*(ringLine(r-2.75,.02)+ringLine(r-4.35,.014)+ringLine(r-6.05,.014))*.5;
        col+=gold*ringLine(r-(uRing+1.85),.03)*.55;
        for(int i=0;i<10;i++){vec2 pp=uPortal[i].xy;float w=uPortal[i].z;
          float dp=length(p-pp);col+=uPortalCol[i]*exp(-dp*dp*.3)*(.06+.5*w);}
        col*=1.-smoothstep(13.2,13.6,r)*.5;
        gl_FragColor=vec4(col,1.);}`, {uPortal: {value: portalPos}, uPortalCol: {value: portalCol}, uRing: {value: HUB_RING}}));
    floorMesh.rotation.x = -Math.PI / 2; scene.add(floorMesh);
    const side = new T.Mesh(new T.CylinderGeometry(13.6, 13.1, .9, 120, 1, true), hubChrome); side.position.y = -.45; scene.add(side);
    const lip = new T.Mesh(new T.TorusGeometry(13.6, .06, 10, 160), hubGold); lip.rotation.x = Math.PI / 2; lip.position.y = .01; scene.add(lip);
    const rim = new T.Mesh(new T.TorusGeometry(13.35, .022, 8, 160), new T.MeshBasicMaterial({color: '#9fd4ff', toneMapped: false}));
    rim.rotation.x = Math.PI / 2; rim.position.y = .02; scene.add(rim);
    return {portalPos};
  }

  function hubEnergyRing(radius, y, color, tube, glowTube, dashes, speed) {
    // Thin bright core plus a soft additive tube with light dashes travelling round.
    const group = new T.Group(); group.position.y = y; scene.add(group);
    const core = new T.Mesh(new T.TorusGeometry(radius, tube, 8, 220), new T.MeshBasicMaterial({color, toneMapped: false, transparent: true}));
    const glowMat = hubShader(`uniform vec3 uColor;uniform float uDash,uSpeed,uGain;varying vec2 vUv;varying vec3 vN;varying vec3 vV;
      void main(){float soft=pow(abs(dot(normalize(vN),normalize(vV))),2.4);
        float dash=pow(.5+.5*sin((vUv.x*uDash-uTime*uSpeed)*6.2832),8.);
        gl_FragColor=vec4(uColor*soft*(.28+1.1*dash)*uGain,1.);}`,
      {uColor: {value: new T.Color(color)}, uDash: {value: dashes}, uSpeed: {value: speed}, uGain: {value: reduced ? 1 : 0}}, {material: hubAdditive});
    const glow = new T.Mesh(new T.TorusGeometry(radius, glowTube, 10, 220), glowMat);
    for (const ringMesh of [core, glow]) { ringMesh.rotation.x = Math.PI / 2; group.add(ringMesh); }
    core.material.opacity = reduced ? 1 : 0;
    return {group, core, glowMat};
  }

  function hubMotes(count, radius, height, color, options = {}) {
    // GPU-animated motes: positions come from time + seed, so no per-frame CPU work.
    const position = new Float32Array(count * 3), seed = new Float32Array(count);
    for (let i = 0; i < count; i++) seed[i] = hubHash(i * 4.13 + radius) * 100;
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.BufferAttribute(position, 3));
    geometry.setAttribute('aSeed', new T.BufferAttribute(seed, 1));
    const points = new T.Points(geometry, new T.ShaderMaterial({...hubAdditive, uniforms: {uTime: hubTime, uScale: hubPointScale,
      uColor: {value: new T.Color(color)}, uRadius: {value: radius}, uHeight: {value: height}, uRise: {value: options.rise ?? 1},
      uSize: {value: options.size ?? 1}, uPower: {value: 1}},
      vertexShader: `attribute float aSeed;uniform float uTime,uScale,uRadius,uHeight,uRise,uSize,uPower;varying float vA;
        void main(){float s1=fract(aSeed*.917),s2=fract(aSeed*.371),s3=fract(aSeed*.613);
          float h=mod(s1*uHeight+uTime*(.25+.5*s2)*uRise,uHeight);
          float a=s3*6.2832+uTime*(.12+.2*s1)*(s2>.5?1.:-1.);
          float r=uRadius*(.25+.75*sqrt(s2));
          vec4 mv=modelViewMatrix*vec4(cos(a)*r,h,sin(a)*r,1.);gl_Position=projectionMatrix*mv;
          vA=smoothstep(0.,.12,h/uHeight)*(1.-smoothstep(.6,1.,h/uHeight))*(.4+.6*s1)*uPower;
          gl_PointSize=clamp((.035+.05*s3)*uSize*uScale/-mv.z,1.,18.);}`,
      fragmentShader: hubOutput(`uniform vec3 uColor;varying float vA;
        void main(){float d=length(gl_PointCoord-.5);float g=smoothstep(.5,0.,d);gl_FragColor=vec4(uColor*g*g*vA*1.6,1.);}`)}));
    points.frustumCulled = false; return points;
  }

  function hubStageBuild() {
    // Dark metallic geometric pedestal: three faceted octagonal gunmetal tiers, a
    // glowing gold base and top rim, a crown inlay, light beam and rising motes.
    // `mount` turns to face the camera and carries the Guardian.
    const stage = new T.Group(); scene.add(stage);
    const mount = new T.Group(); stage.add(mount);
    const gunmetal = new T.MeshPhysicalMaterial({color: '#202631', metalness: .92, roughness: .24, envMapIntensity: 1.25,
      clearcoat: 1, clearcoatRoughness: .08, emissive: '#070b14', flatShading: true});
    const seamGold = new T.MeshBasicMaterial({color: '#f4d18e', toneMapped: false});
    const octagon = new T.Group(); octagon.rotation.y = Math.PI / 8; stage.add(octagon); // a flat facet faces the viewer
    for (const [top, bottom, height, y] of [[1.95, 2.14, .22, .11], [1.66, 1.82, .2, .32], [1.36, 1.48, .18, .51]]) {
      const tier = new T.Mesh(new T.CylinderGeometry(top, bottom, height, 8), gunmetal); tier.position.y = y; octagon.add(tier);
      const edge = new T.Mesh(new T.TorusGeometry(top, .012, 6, 8), hubGold);
      edge.rotation.x = Math.PI / 2; edge.position.y = y + height / 2 + .002; octagon.add(edge);
    }
    const topRim = new T.Mesh(new T.TorusGeometry(1.36, .014, 6, 8), seamGold); // glowing rim of the top tier
    topRim.rotation.x = Math.PI / 2; topRim.position.y = HUB_STAGE_TOP; octagon.add(topRim);
    const baseGlow = new T.Mesh(new T.TorusGeometry(2.14, .03, 6, 8), seamGold);
    baseGlow.rotation.x = Math.PI / 2; baseGlow.position.y = .005; octagon.add(baseGlow);
    const crown = new T.Mesh(new T.CircleGeometry(1.22, 72), new T.MeshBasicMaterial({map: hubCrownTexture(), toneMapped: false}));
    crown.rotation.x = -Math.PI / 2; crown.position.y = HUB_STAGE_TOP + .003; mount.add(crown);
    const beamMat = hubShader(`uniform vec3 uColor;uniform float uPower;varying vec2 vUv;varying vec3 vN;varying vec3 vV;
      void main(){float core=pow(abs(dot(normalize(vN),normalize(vV))),3.);
        float fade=exp(-vUv.y*5.5);float bands=.65+.35*sin(vUv.y*46.-uTime*3.2);
        gl_FragColor=vec4(uColor*core*fade*bands*uPower,1.);}`,
      {uColor: {value: new T.Color('#9fdcff')}, uPower: {value: reduced ? .85 : 0}}, {material: {...hubAdditive, side: T.DoubleSide}});
    const beam = new T.Mesh(new T.CylinderGeometry(.14, .48, 15, 40, 1, true), beamMat);
    beam.position.y = HUB_STAGE_TOP + 7.5; stage.add(beam);
    const motes = hubMotes(150, 1.35, 6, '#cfeeff'); motes.position.y = HUB_STAGE_TOP; stage.add(motes);
    const light = new T.PointLight('#bfe4ff', reduced ? 26 : 0, 0, 2); light.position.set(0, 2.8, 0); stage.add(light);
    // Invisible pick volume so taps on the Guardian never fall through to the portal behind.
    const proxy = new T.Mesh(new T.CylinderGeometry(1.05, 1.05, 3.9, 12), new T.MeshBasicMaterial({visible: false}));
    proxy.position.y = HUB_STAGE_TOP + 1.95; mount.add(proxy);
    hubStage = {stage, mount, beam, beamMat, motes, light, proxy};
  }

  // Continuous arrival: the Guardian flies in over the focused portal, lands on the
  // pedestal as the intro settles (the existing Build 230 flight pose, blended back
  // to standing), gives at the knees, and hands over to breathing. Under Reduce
  // Motion he simply stands there from the start.
  const HUB_GUARDIAN_FLIGHT = {start: 2.0, seconds: 2.3, settle: .6};
  function hubGuardianArrival() {
    const {flight, guardian, wingPose} = hubGuardianFlight;
    const occupy = () => {
      // The stage light would sit inside his chest: make it a frontal key light (the
      // mount turns with the camera, so it stays frontal) and let the beam step back
      // as soon as he appears, so he never flies through a blown-out beam.
      flight.visible = true;
      hubStage.guardian = guardian;
      hubStage.mount.add(hubStage.light); hubStage.light.position.set(0, 3.4, 3.4);
    };
    const land = () => {
      hubGuardianFlight.active = false;
      flight.position.set(0, 0, 0); flight.rotation.set(0, 0, 0); occupy();
      guardianArrivalPending = true;
      if (hubLoopReady) requestDraw();
    };
    if (reduced) { land(); return; }
    flight.visible = false;
    flight.updateMatrixWorld(true);
    const frameInverse = flight.getWorldQuaternion(new T.Quaternion()).invert(), q = new T.Quaternion();
    const rig = (name, extra) => {
      const joint = guardian.getObjectByName('B230_QA_Joint_' + name);
      if (!joint?.isBone) return [];
      const inverse = frameInverse.clone().multiply(joint.getWorldQuaternion(q)).invert();
      return [{joint, rest: joint.quaternion.clone(), ...extra,
        pitchAxis: new T.Vector3(1, 0, 0).applyQuaternion(inverse), spreadAxis: new T.Vector3(0, 0, 1).applyQuaternion(inverse)}];
    };
    const flightJoints = [
      ['Chest', .12, 0, 0],
      ['UpperArm_L', -1.28, -.28, -.22], ['UpperArm_R', -.72, .55, .30],
      ['Forearm_L', -.20, 0, -.10], ['Forearm_R', -.42, 0, .16],
      ['Hand_L', .12, -.03, -.06], ['Hand_R', .18, .06, .10],
      ['Thigh_L', .20, 0, 0], ['Thigh_R', .29, 0, 0],
      ['Calf_L', -.23, 0, 0], ['Calf_R', -.31, 0, 0],
    ].flatMap(([name, pitch, spread, steer]) => rig(name, {pitch, spread, steer}));
    const knees = [['Thigh_L', .22], ['Thigh_R', .22], ['Calf_L', -.36], ['Calf_R', -.36]].flatMap(([name, bend]) => rig(name, {bend}));
    const path = new T.CubicBezierCurve3(new T.Vector3(5.2, 6.2, -11.5), new T.Vector3(-1.8, 4.2, -7.2),
      new T.Vector3(-.9, .25, -1.7), new T.Vector3(0, 0, 0));
    let begin = null, touchdown = null;
    animated.push(time => {
      if (!hubGuardianFlight.active || disposed) return;
      begin ??= Math.max(time, HUB_GUARDIAN_FLIGHT.start);
      if (time < begin) return; // the pedestal waits empty while the hub powers up
      if (!flight.visible) occupy();
      const progress = Math.min((time - begin) / HUB_GUARDIAN_FLIGHT.seconds, 1);
      if (progress < 1) {
        wingPose?.(false,progress);
        const eased = progress * progress * (3 - 2 * progress);
        path.getPoint(eased, flight.position);
        const bank = Math.sin(Math.PI * progress) * (1 - progress);
        flight.rotation.set(.16 * bank, -.32 * bank, .38 * bank);
        const poseWeight = 1 - T.MathUtils.smoothstep(progress, .66, 1), steering = Math.sin(progress * Math.PI * 2);
        for (const {joint, rest, pitch, spread, steer, pitchAxis, spreadAxis} of flightJoints) {
          joint.quaternion.copy(rest)
            .multiply(q.setFromAxisAngle(pitchAxis, pitch * poseWeight))
            .multiply(q.setFromAxisAngle(spreadAxis, (spread + steer * steering) * poseWeight));
        }
        return;
      }
      // Touchdown: the knees give and straighten again while the body dips and rises.
      touchdown ??= time;
      flight.position.set(0, 0, 0); flight.rotation.set(0, 0, 0);
      for (const {joint, rest} of flightJoints) joint.quaternion.copy(rest);
      const u = Math.min((time - touchdown) / HUB_GUARDIAN_FLIGHT.settle, 1);
      wingPose?.(true,u);
      const give = Math.sin(Math.PI * u) * (1 - .35 * u);
      flight.position.y = -.055 * give;
      for (const {joint, rest, bend, pitchAxis} of knees) joint.quaternion.copy(rest).multiply(q.setFromAxisAngle(pitchAxis, bend * give));
      if (u >= 1) land();
    });
  }

  function hubPortalEnergy(a, b, i) {
    // Portal surface: swirling vortex, sparkles, rim light and an iris that opens on
    // ignition. If locked artwork is bundled it sits in the centre, contain-fit
    // (never cropped or stretched).
    return hubShader(`uniform vec3 uA,uB;uniform vec2 uSize;uniform float uOpen,uFocus,uFlash,uHasMap,uMapAspect,uSeed;uniform sampler2D uMap;varying vec2 vPos;
      void main(){float inside=-archSdf(vPos,uSize.x,uSize.y);
        vec2 q=(vPos-vec2(0.,uSize.y*.52))/uSize.x;float rad=length(q),ang=atan(q.y,q.x);
        float t=uTime+uSeed;
        float fil=pow(.5+.5*sin(ang*3.+rad*11.-t*1.1),5.)*smoothstep(1.05,.08,rad);
        float n=fbm(vec2(ang*1.6+t*.06,rad*3.4-t*.32)+uSeed);
        vec3 col=mix(uB*.05,uA*.2,smoothstep(1.,0.,rad));
        col+=uA*(fil*.5+n*n*.42)+uB*pow(n,3.)*.55;
        col+=mix(uA,vec3(1.),.55)*exp(-rad*rad*16.)*.6;
        vec2 sp=vPos*8.;float sh=hash12(floor(sp)+uSeed*7.);
        col+=vec3(1.)*step(.93,sh)*smoothstep(.4,0.,length(fract(sp)-.5))*pow(max(0.,sin(t*2.6+sh*50.)),10.);
        if(uHasMap>.5){float bw=uSize.x*.86,bh=bw/uMapAspect;
          if(bh>uSize.y*.6){bh=uSize.y*.6;bw=bh*uMapAspect;}
          vec2 auv=(vPos-vec2(0.,uSize.y*.5))/vec2(bw,bh)+.5;
          float inBox=step(0.,auv.x)*step(auv.x,1.)*step(0.,auv.y)*step(auv.y,1.);
          float soft=smoothstep(0.,.035,auv.x)*smoothstep(1.,.965,auv.x)*smoothstep(0.,.05,auv.y)*smoothstep(1.,.95,auv.y);
          vec3 art=texture2D(uMap,clamp(auv,0.,1.)).rgb;
          col=mix(col,art*(.6+.48*uFocus),inBox*soft);
          col+=mix(uA,vec3(1.),.4)*inBox*(1.-soft)*.35;}
        col+=mix(uA,vec3(1.),.4)*exp(-inside*6.5)*(.45+.7*uFocus);
        float front=uOpen*1.45;
        float open=smoothstep(front,front-.14,rad);
        float iris=exp(-pow((rad-front)*12.,2.))*(1.-uOpen)*step(.001,uOpen);
        vec3 closed=vec3(.01,.012,.02)+uA*exp(-inside*8.)*.08;
        col=mix(closed,col,open)+mix(uA,vec3(1.),.6)*iris*1.6;
        col*=mix(.5,1.1,uFocus);
        col+=mix(uA,vec3(1.),.75)*uFlash*.85;
        gl_FragColor=vec4(col,1.);}`,
      {uA: {value: new T.Color(a)}, uB: {value: new T.Color(b)}, uSize: {value: new T.Vector2(HUB_PORTAL.w, HUB_PORTAL.h)},
        uOpen: {value: reduced ? 1 : 0}, uFocus: {value: 0}, uFlash: {value: 0}, uHasMap: {value: 0}, uMapAspect: {value: 16 / 9},
        uSeed: {value: i * 3.71}, uMap: {value: null}});
  }

  function hubBuildPortals(floorRef) {
    const {w, h, rim, lift} = HUB_PORTAL;
    const outline = (width, height, y0, path) => {
      const r = width / 2, top = y0 + height - r;
      path.moveTo(-r, y0); path.lineTo(r, y0); path.lineTo(r, top); path.absarc(0, top, r, 0, Math.PI, false); path.lineTo(-r, y0);
      return path;
    };
    const frameShape = outline(w + rim * 2, h + rim * 2, -rim, new T.Shape()); frameShape.holes.push(outline(w, h, 0, new T.Path()));
    const frameGeo = new T.ExtrudeGeometry(frameShape, {depth: .16, bevelEnabled: true, bevelThickness: .05, bevelSize: .045, bevelSegments: 3, curveSegments: 36}).translate(0, 0, -.08);
    const trimShape = outline(w + .02, h + .02, -.01, new T.Shape()); trimShape.holes.push(outline(w - .12, h - .12, .06, new T.Path()));
    const trimGeo = new T.ExtrudeGeometry(trimShape, {depth: .2, bevelEnabled: false, curveSegments: 36}).translate(0, 0, -.1);
    const glassGeo = new T.ShapeGeometry(outline(w, h, 0, new T.Shape()), 36);
    const haloGeo = new T.PlaneGeometry(w + 5.2, h + 4.4).translate(0, h / 2, 0);
    const plateGeo = new T.PlaneGeometry(2.9, 2.9 * 208 / 1024);
    const pedestalGeo = new T.CylinderGeometry(1.15, 1.32, .24, 56);
    const pedRingGeo = new T.TorusGeometry(1.2, .028, 8, 96), pedGoldGeo = new T.TorusGeometry(1.33, .03, 8, 96);
    const columnFor = height => new T.CylinderGeometry(.95, 1.12, height, 40, 1, true);
    const archColumn = lift - rim - .05 - .24, cardColumn = HUB_CARD.lift - .05 - .24;
    const archColumnGeo = columnFor(archColumn), cardColumnGeo = columnFor(cardColumn);
    // Touch target: one generous invisible plane per portal (2 triangles) covering
    // the pedestal, the portal and its nameplate. A finger never has to hit a thin
    // chrome edge, and a tap tests 22 triangles instead of tens of thousands.
    const proxyMat = new T.MeshBasicMaterial({side: T.DoubleSide, visible: false});
    const hubBackGlass = new T.MeshStandardMaterial({color: '#0b0e15', metalness: .9, roughness: .24, envMapIntensity: .9});
    const loader = new T.TextureLoader();
    const haloMaterial = (accent, width, height, rimWidth) => hubShader(`uniform vec3 uA;uniform vec2 uSize;uniform float uRim,uGlow;varying vec2 vPos;
        void main(){float d=archSdf(vPos-vec2(0.,-uRim),uSize.x+2.*uRim,uSize.y+2.*uRim);float o=max(d,0.);
          float g=(exp(-o*2.6)*.85+exp(-o*.8)*.32)*smoothstep(2.4,1.,o)*step(-.05,d);
          gl_FragColor=vec4(uA*g*uGlow*(.9+.1*sin(uTime*1.7+vPos.y*.6)),1.);}`,
      {uA: {value: accent.clone()}, uSize: {value: new T.Vector2(width, height)}, uRim: {value: rimWidth}, uGlow: {value: 0}}, {material: hubAdditive});

    // Approved portal illustration on a floating card: chrome sheen sweep, twinkling
    // diamonds, an accent halo that follows the arch, and a scan-line reveal when the
    // portal ignites. Seen from behind it is dark metal, so no portal looks hollow.
    function cardPortal(portal, src, i) {
      portal.lift = HUB_CARD.lift; portal.mid = HUB_CARD.height * .5;
      const cardMat = hubShader(`uniform sampler2D uMap;uniform vec3 uA;uniform float uOpen,uFocus,uFlash,uSeed,uLoaded;varying vec2 vUv;
        void main(){vec4 t=texture2D(uMap,vUv);vec3 col=t.rgb;float a=t.a*uLoaded;
          float l=max(col.r,max(col.g,col.b)),sat=l-min(col.r,min(col.g,col.b));
          if(gl_FrontFacing){
            float chrome=smoothstep(.42,.85,l)*(1.-smoothstep(.1,.32,sat));
            float sweep=fract(uTime*.09+uSeed*.13)*3.2-1.1;
            col+=vec3(1.)*chrome*exp(-pow((vUv.x*.9+vUv.y*.55-sweep)*6.5,2.))*.42;
            float h=hash12(floor(vUv*vec2(96.,88.))+uSeed);
            col+=vec3(1.)*smoothstep(.8,.97,l)*pow(max(0.,sin(uTime*(1.8+2.6*h)+h*40.)),14.)*.85;
            col*=mix(.58,1.06,uFocus);
            col+=mix(uA,vec3(1.),.7)*uFlash*.55;
          }else{col=vec3(.05,.055,.07)+uA*.1*(1.-a);}
          float edge=uOpen*1.3-.12;
          float shown=smoothstep(edge,edge-.06,vUv.y);
          float scan=exp(-pow((vUv.y-edge)*38.,2.))*step(.002,uOpen)*(1.-step(.999,uOpen))*step(.08,t.a);
          col+=mix(uA,vec3(1.),.5)*scan*2.;
          gl_FragColor=vec4(col,clamp(a*shown+scan*.7*uLoaded,0.,1.));}`,
        {uMap: {value: null}, uA: {value: portal.accent.clone()}, uOpen: {value: reduced ? 1 : 0}, uFocus: {value: 0},
          uFlash: {value: 0}, uSeed: {value: i * 3.71}, uLoaded: {value: 0}},
        {material: {transparent: true, depthWrite: false, side: T.DoubleSide}});
      let haloMat = null;
      loader.load(src, texture => {
        if (disposed) { texture.dispose(); return; }
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        const height = HUB_CARD.height, width = height * texture.image.width / Math.max(1, texture.image.height);
        const card = new T.Mesh(new T.PlaneGeometry(width, height).translate(0, height / 2, 0), cardMat);
        card.renderOrder = 2; portal.lifted.add(card);
        haloMat = haloMaterial(portal.accent, width * .9, height * .93, 0);
        const halo = new T.Mesh(new T.PlaneGeometry(width + 4.6, height + 4).translate(0, height / 2, 0), haloMat);
        halo.position.z = -.25; halo.renderOrder = 1; portal.lifted.add(halo);
        cardMat.uniforms.uMap.value = texture; cardMat.uniforms.uLoaded.value = 1;
        // Fit the touch target to this card's real width (capped short of the neighbours).
        if (portal.proxy) portal.proxy.scale.x = Math.min(6.2, width + .4) / HUB_CARD.proxyWidth;
        if (hubLoopReady) requestDraw();
      }, undefined, () => { /* an undecodable card leaves the pedestal glowing on its own */ });
      portal.apply = (ig, f, flash) => {
        cardMat.uniforms.uOpen.value = ig; cardMat.uniforms.uFocus.value = f; cardMat.uniforms.uFlash.value = flash;
        if (haloMat) haloMat.uniforms.uGlow.value = ig * (.22 + .75 * f) + flash * 1.2;
      };
      return HUB_CARD.proxyWidth;
    }

    // Procedural fallback when no illustration is bundled: chrome arch with gold trim,
    // energy surface, nameplate and halo.
    function archPortal(portal, accentA, accentB, i) {
      portal.lift = lift; portal.mid = h * .5;
      const {lifted} = portal;
      lifted.add(new T.Mesh(frameGeo, hubChrome));
      lifted.add(new T.Mesh(trimGeo, hubGoldTrim));
      const energy = hubPortalEnergy(accentA, accentB, i);
      const glass = new T.Mesh(glassGeo, energy); glass.position.z = -.02; lifted.add(glass);
      const back = new T.Mesh(glassGeo, hubBackGlass); back.rotation.y = Math.PI; back.position.z = -.07; lifted.add(back); // no hollow frames from behind
      const haloMat = haloMaterial(portal.accent, w, h, rim);
      const halo = new T.Mesh(haloGeo, haloMat); halo.position.z = -.2; halo.renderOrder = 1; lifted.add(halo);
      const plateMat = new T.MeshBasicMaterial({map: hubNameplateTexture(names[i], accentA), transparent: true, toneMapped: false, opacity: reduced ? 1 : 0});
      const plate = new T.Mesh(plateGeo, plateMat); plate.position.set(0, .44, .2); plate.renderOrder = 3; lifted.add(plate);
      portal.apply = (ig, f, flash) => {
        energy.uniforms.uOpen.value = ig; energy.uniforms.uFocus.value = f; energy.uniforms.uFlash.value = flash;
        haloMat.uniforms.uGlow.value = ig * (.35 + 1.05 * f) + flash * 1.4;
        plateMat.opacity = hubClamp(ig * 1.4 - .2, 0, 1) * (.72 + .28 * f);
      };
      return w + 1.3;
    }

    ids.forEach((id, i) => {
      const alpha = Math.PI - i * HUB_STEP; // portal 0 opposite the camera; order runs left → right
      const group = new T.Group(); group.position.set(Math.sin(alpha) * HUB_RING, 0, Math.cos(alpha) * HUB_RING);
      group.rotation.y = alpha + Math.PI; scene.add(group); // face the stage
      floorRef.portalPos[i].set(group.position.x, group.position.z, 0);
      const [accentA, accentB] = HUB_ACCENTS[id] || ['#bfe6ff', '#f0d49a'];
      const lifted = new T.Group(); group.add(lifted);
      const portal = {id, index: i, group, lifted, accent: new T.Color(accentA), lift, mid: h * .5,
        yaw: -i * HUB_STEP, ignite: reduced ? 1 : 0, flash: 0, focus: 0, phase: hubHash(i * 5.3) * 6.28};
      const art = window.STAAR_PORTAL_ARTWORK?.[id];
      const isCard = typeof art === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(art);
      const proxyWidth = isCard ? cardPortal(portal, art, i) : archPortal(portal, accentA, accentB, i);
      lifted.position.y = portal.lift;
      const pedestal = new T.Mesh(pedestalGeo, hubChrome); pedestal.position.y = .12; group.add(pedestal);
      portal.pedRingMat = new T.MeshBasicMaterial({color: portal.accent.clone(), toneMapped: false});
      const pedRing = new T.Mesh(pedRingGeo, portal.pedRingMat); pedRing.rotation.x = Math.PI / 2; pedRing.position.y = .245; group.add(pedRing);
      const pedGold = new T.Mesh(pedGoldGeo, hubGold); pedGold.rotation.x = Math.PI / 2; pedGold.position.y = .02; group.add(pedGold);
      portal.columnMat = hubShader(`uniform vec3 uA;uniform float uPower;varying vec2 vUv;varying vec3 vN;varying vec3 vV;
        void main(){float f=abs(dot(normalize(vN),normalize(vV)));
          float rise=.6+.4*sin(vUv.y*20.-uTime*3.);
          gl_FragColor=vec4(uA*(pow(f,2.)*.25+pow(1.-f,3.)*.6)*rise*(1.-vUv.y*.5)*uPower,1.);}`,
        {uA: {value: portal.accent.clone()}, uPower: {value: reduced ? .6 : 0}}, {material: {...hubAdditive, side: T.DoubleSide}});
      const columnHeight = isCard ? cardColumn : archColumn;
      const column = new T.Mesh(isCard ? cardColumnGeo : archColumnGeo, portal.columnMat); column.position.y = .24 + columnHeight / 2; group.add(column);
      const proxyHeight = portal.lift + (isCard ? HUB_CARD.height + .5 : h + rim + .7);
      const proxy = new T.Mesh(new T.PlaneGeometry(proxyWidth, proxyHeight), proxyMat); proxy.position.set(0, proxyHeight / 2, .15);
      proxy.userData = {action: 'world:' + id, label: names[i], index: i};
      group.add(proxy); clickable.push(proxy); hubProxies.push(proxy);
      portal.proxy = proxy; hubPortals.push(portal);
    });
  }

  function hubInterface() {
    // In-page caption: ‹ focused world › with 46 px targets. Sits above the React
    // Native control row (14.2% of the height, or the safe area + 94 px).
    const style = document.createElement('style');
    style.textContent = `
      html,body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;overscroll-behavior:none}
      body.hub-immersive header{display:none}
      body.hub-immersive footer{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;margin:-1px;padding:0;border:0}
      #hub-caption{position:absolute;left:50%;bottom:max(14.2vh,calc(env(safe-area-inset-bottom,0px) + 94px));transform:translate(-50%,12px);display:flex;align-items:center;gap:10px;opacity:0;transition:opacity .55s ease,transform .55s ease;pointer-events:none;z-index:4}
      #hub-caption.on{opacity:1;transform:translate(-50%,0);pointer-events:auto}
      #hub-caption button{background:rgba(10,12,20,.6);border:1px solid rgba(232,211,164,.55);color:#f4efe4;border-radius:999px;min-height:46px;min-width:46px;padding:0;font:500 26px/1 ${HUB_FONT};-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:0 0 18px rgba(232,200,140,.16),inset 0 1px 0 rgba(255,255,255,.16);touch-action:manipulation}
      #hub-caption button:active{transform:scale(.96)}
      #hub-name{min-width:210px!important;padding:9px 22px!important;display:flex;flex-direction:column;align-items:center;gap:4px}
      #hub-name b{font:700 15px/1.1 ${HUB_FONT};letter-spacing:.2em;background:linear-gradient(180deg,#fff,#d9dee8 55%,#a9b2c2);-webkit-background-clip:text;background-clip:text;color:transparent;transition:opacity .16s ease}
      #hub-name small{font:600 9.5px/1 ${HUB_FONT};letter-spacing:.14em;color:#e9cf96;white-space:nowrap;transition:opacity .16s ease}
      #hub-caption.swap b,#hub-caption.swap small{opacity:0}
      @media (prefers-reduced-motion:reduce){#hub-caption,#hub-name b,#hub-name small{transition:none}}`;
    document.head.append(style);
    document.body.classList.add('hub-immersive');
    // Lock page zoom: pinch belongs to the 3D camera, not to WKWebView scaling.
    document.querySelector('meta[name="viewport"]')?.setAttribute('content',
      'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');
    document.addEventListener('gesturestart', e => e.preventDefault());
    const caption = document.createElement('div'); caption.id = 'hub-caption';
    const button = (id, label, aria) => {
      const b = document.createElement('button'); b.id = id; b.type = 'button'; b.textContent = label;
      if (aria) b.setAttribute('aria-label', aria); return b;
    };
    const prev = button('hub-prev', '‹', 'Previous world'), next = button('hub-next', '›', 'Next world'), name = button('hub-name', '');
    const title = document.createElement('b'), hint = document.createElement('small');
    hint.textContent = 'SWIPE TO TURN · TAP TO ENTER'; name.append(title, hint);
    caption.append(prev, name, next); document.body.append(caption);
    const status = document.querySelector('#status');
    let shown = -1, swapTimer = 0;
    return {
      bind(rig) {
        prev.addEventListener('click', () => rig.step(-1));
        next.addEventListener('click', () => rig.step(1));
        name.addEventListener('click', () => rig.enterFocused());
        addEventListener('keydown', e => {
          if (e.metaKey || e.ctrlKey || e.altKey) return;
          if (e.key === 'ArrowRight') { rig.step(1); e.preventDefault(); }
          else if (e.key === 'ArrowLeft') { rig.step(-1); e.preventDefault(); }
        });
      },
      show() { caption.classList.add('on'); },
      set(i) {
        if (i === shown) return; shown = i;
        const apply = () => { title.textContent = names[i].toUpperCase(); name.setAttribute('aria-label', 'Enter ' + names[i]); caption.classList.remove('swap'); };
        clearTimeout(swapTimer);
        if (reduced || !title.textContent) apply(); else { caption.classList.add('swap'); swapTimer = setTimeout(apply, 150); }
      },
      announce(i) { if (status) status.textContent = names[i] + ', ' + (i + 1) + ' of ' + ids.length + '. Swipe to turn the ring; tap the centred portal to enter.'; },
      interacted() { hint.textContent = 'TAP PORTAL TO ENTER'; },
    };
  }

  function createHubRig(ui, floorRef, rings) {
    const N = ids.length;
    const st = {yaw: 0, vel: 0, target: 0, focus: 0, dist: HUB_CAM.dist, distTarget: HUB_CAM.dist, look: 0, lookTarget: 0,
      push: 1, pulse: 0, intro: !reduced, introT: 0, fast: false, dragging: false, live: -1, lastEnter: -1e9, power: reduced ? 1 : 0};
    const indexFor = yaw => ((Math.round(-yaw / HUB_STEP) % N) + N) % N;
    const yawFor = (i, from) => { const base = -i * HUB_STEP; return base + Math.PI * 2 * Math.round((from - base) / (Math.PI * 2)); };
    const ray = new T.Raycaster(), ndc = new T.Vector2(), probe = new T.Vector3();
    const pickables = [hubStage.proxy, ...hubProxies];
    const draw = () => { if (hubLoopReady) requestDraw(); };

    function focus(i, velocity = 0) {
      i = ((i % N) + N) % N; st.focus = i; st.target = yawFor(i, st.yaw);
      if (reduced) { st.yaw = st.target; st.vel = 0; } else st.vel = velocity;
      ui.announce(i); report('focus', {action: 'world:' + ids[i]}); draw();
    }
    function enter(i) {
      const now = performance.now(); if (now - st.lastEnter < 900) return; st.lastEnter = now;
      const portal = hubPortals[i]; portal.flash = 1; if (!reduced) st.push = 0;
      report('select', {action: 'world:' + portal.id}); draw();
    }
    const skipIntro = () => { if (st.intro) st.fast = true; };
    function step(direction) { skipIntro(); ui.interacted(); focus(st.focus + direction); }
    function enterFocused() { if (st.intro) { skipIntro(); return; } enter(st.focus); }
    function trackPortal(i) {
      // Approved model only: glance toward the portal's on-screen bearing, projected
      // onto the camera plane so the neck never twists toward the portal behind him.
      if (!guardianHeadTracking?.ready) return;
      hubPortals[i].lifted.getWorldPosition(probe); probe.y += hubPortals[i].mid * 1.1;
      camera.updateMatrixWorld(); probe.applyMatrix4(camera.matrixWorldInverse); probe.z = 0; probe.applyMatrix4(camera.matrixWorld);
      guardianHeadTracking.setTargetWorld(probe);
    }
    function pick(clientX, clientY) {
      const r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return null;
      ndc.set((clientX - r.left) / r.width * 2 - 1, -(clientY - r.top) / r.height * 2 + 1);
      camera.updateMatrixWorld(); ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickables, false)[0];
      if (hit) return hit.object === hubStage.proxy ? 'stage' : hit.object.userData.index;
      // Forgiving fallback for small on-screen portals (landscape, iPad split view).
      let best = null, bestDistance = Math.max(28, Math.min(r.width, r.height) * .06);
      for (const portal of hubPortals) {
        portal.lifted.getWorldPosition(probe); probe.y += portal.mid;
        probe.applyMatrix4(camera.matrixWorldInverse); if (probe.z > -.5) continue;
        probe.applyMatrix4(camera.projectionMatrix);
        const d = Math.hypot((probe.x + 1) / 2 * r.width + r.left - clientX, (1 - probe.y) / 2 * r.height + r.top - clientY);
        if (d < bestDistance) { best = portal.index; bestDistance = d; }
      }
      return best;
    }
    function tap(x, y) {
      if (st.intro) return;
      const target = pick(x, y);
      if (target === 'stage') { st.pulse = 1; draw(); return; }
      if (target === null) return;
      ui.interacted();
      const aligned = Math.abs(hubWrap(st.yaw - yawFor(target, st.yaw))) < HUB_STEP * .22;
      if (target === st.focus && aligned) enter(target); else focus(target);
    }

    // Touch: one finger turns the ring (with inertia and snap), two fingers pinch the
    // camera closer. A tap counts only for a single short, still touch, so lifting
    // the resting finger of a pinch can never open a portal by accident.
    const pointers = new Map(); let gesture = null;
    const slop = () => Math.max(9, Math.min(canvas.clientWidth || innerWidth, canvas.clientHeight || innerHeight) * .022);
    const spread = () => { const [a, b] = [...pointers.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0; };
    canvas.addEventListener('pointerdown', e => {
      if (disposed || (e.pointerType === 'mouse' && e.button !== 0)) return;
      try { canvas.setPointerCapture(e.pointerId); } catch { /* capture is best effort in WKWebView */ }
      pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
      skipIntro();
      const now = e.timeStamp || performance.now();
      if (pointers.size === 1) { gesture = {x0: e.clientX, y0: e.clientY, t0: now, x: e.clientX, y: e.clientY, t: now, moved: false, multi: false, vel: 0}; st.vel = 0; }
      else if (gesture) { gesture.multi = true; gesture.spread0 = spread(); gesture.dist0 = st.distTarget; st.dragging = false; }
      draw();
    });
    canvas.addEventListener('pointermove', e => {
      const point = pointers.get(e.pointerId); if (!point || !gesture) return;
      point.x = e.clientX; point.y = e.clientY;
      if (st.intro) return;
      const now = e.timeStamp || performance.now();
      if (pointers.size >= 2) {
        const d = spread();
        if (gesture.spread0 > 0 && d > 0) st.distTarget = hubClamp(gesture.dist0 * gesture.spread0 / d, HUB_CAM.minDist, HUB_CAM.maxDist);
        draw(); return;
      }
      if (gesture.multi) return; // the finger left over after a pinch never drags or taps
      if (!gesture.moved && Math.hypot(e.clientX - gesture.x0, e.clientY - gesture.y0) > slop()) { gesture.moved = true; st.dragging = true; ui.interacted(); }
      if (gesture.moved) {
        const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y, dt = Math.max(.001, (now - gesture.t) / 1000);
        const k = HUB_STEP * 1.55 / Math.max(260, canvas.clientWidth || innerWidth);
        st.yaw += dx * k; st.target = st.yaw;
        gesture.vel = gesture.vel * .55 + dx * k / dt * .45;
        st.lookTarget = hubClamp(st.lookTarget + dy * .009, -1.1, 1.7);
        draw();
      }
      gesture.x = e.clientX; gesture.y = e.clientY; gesture.t = now;
    });
    const end = e => {
      if (!pointers.delete(e.pointerId) || !gesture || pointers.size) return;
      const g = gesture, now = e.timeStamp || performance.now(); gesture = null; st.dragging = false; st.lookTarget = 0;
      if (e.type === 'pointerup' && !g.multi && !g.moved && now - g.t0 < 500) tap(e.clientX, e.clientY);
      else if (!st.intro) {
        const velocity = g.multi || now - g.t > 80 ? 0 : hubClamp(g.vel, -7, 7); // a finger that rested before lifting has no fling
        focus(indexFor(st.yaw + velocity * .26), velocity);
      }
      draw();
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('lostpointercapture', e => setTimeout(() => end(e), 32)); // fallback only; pointerup normally lands first
    canvas.addEventListener('wheel', e => {
      if (st.intro) return; e.preventDefault();
      st.distTarget = hubClamp(st.distTarget * Math.exp(e.deltaY * .0012), HUB_CAM.minDist, HUB_CAM.maxDist); draw();
    }, {passive: false});

    function update(dt) {
      dt = hubClamp(dt || 0, 0, .1); // real-time down to 10 fps; the spring sub-steps keep it stable
      if (!reduced) hubTime.value += dt;
      let yaw, dist, height, lookY;
      if (st.intro) {
        // Establishing shot: start high outside the ring, sweep round and descend
        // inside it while the floor ring lights, the portals ignite one by one and
        // the Guardian stage powers up.
        st.introT += dt * (st.fast ? 4 : 1);
        const p = Math.min(1, st.introT / HUB_INTRO_SECONDS);
        const e1 = hubEase(Math.min(1, p * 1.15)), e2 = hubEase(hubClamp((p - .16) / .84, 0, 1));
        yaw = 1.3 * (1 - hubEaseOut(p));
        dist = 23 + (HUB_CAM.dist - 23) * e1; height = 13 + (HUB_CAM.height - 13) * e2; lookY = 1.4 + (HUB_CAM.lookY - 1.4) * e2;
        hubPortals.forEach((portal, k) => {
          const before = portal.ignite;
          portal.ignite = hubEaseOut(hubClamp((st.introT - (.5 + k * .17)) / .75, 0, 1));
          if (before === 0 && portal.ignite > 0) portal.flash = Math.max(portal.flash, .9);
        });
        st.power = hubClamp((st.introT - .9) / 1.3, 0, 1);
        if (p >= 1) {
          st.intro = false; st.yaw = st.target = 0; st.vel = 0; st.power = 1;
          hubPortals.forEach(portal => { portal.ignite = 1; });
          ui.show(); ui.announce(0);
        }
      }
      if (!st.intro) {
        if (!st.dragging) {
          if (reduced) { st.yaw = st.target; st.vel = 0; }
          else {
            // Lightly under-damped spring: keeps the fling velocity, settles in ~0.6 s.
            const steps = Math.max(1, Math.ceil(dt / .016)), h = dt / steps;
            for (let s = 0; s < steps; s++) { st.vel += (-34 * (st.yaw - st.target) - 10.5 * st.vel) * h; st.yaw += st.vel * h; }
            if (Math.abs(st.yaw - st.target) < 1e-4 && Math.abs(st.vel) < 1e-3) { st.yaw = st.target; st.vel = 0; }
          }
        }
        st.dist += (st.distTarget - st.dist) * (reduced ? 1 : 1 - Math.exp(-9 * dt));
        st.look += (st.lookTarget - st.look) * (reduced ? 1 : 1 - Math.exp(-6 * dt));
        st.push = Math.min(1, st.push + dt / .85);
        yaw = st.yaw; dist = st.dist - (reduced ? 0 : Math.sin(Math.PI * st.push) * .9);
        height = HUB_CAM.height + st.look * .22; lookY = HUB_CAM.lookY + st.look;
        const live = indexFor(yaw);
        if (live !== st.live) { st.live = live; ui.set(live); }
        // The Guardian's head follows the portal you drag, or the one sliding into focus.
        trackPortal(st.dragging ? live : st.focus);
      }
      camera.position.set(Math.sin(yaw) * dist, height, Math.cos(yaw) * dist);
      camera.lookAt(0, lookY, 0);
      const time = hubTime.value, ease = rate => reduced ? 1 : 1 - Math.exp(-rate * dt);
      const ringPower = st.intro ? hubClamp((st.introT - .15) / .9, 0, 1) : 1;
      const haloPower = st.intro ? hubClamp((st.introT - 2.3) / .8, 0, 1) : 1;
      rings.floor.glowMat.uniforms.uGain.value = ringPower; rings.floor.core.material.opacity = ringPower;
      rings.halo.glowMat.uniforms.uGain.value = haloPower; rings.halo.core.material.opacity = haloPower;
      const stage = hubStage;
      stage.mount.rotation.y += hubWrap(yaw - stage.mount.rotation.y) * ease(5); // the Guardian turns to face you
      const beamGrow = Math.max(.001, hubEaseOut(st.power));
      stage.beam.scale.y = beamGrow; stage.beam.position.y = HUB_STAGE_TOP + 7.5 * beamGrow;
      const occupied = stage.guardian ? .22 : 1; // a dimmer beam once the Guardian stands in it
      stage.beamMat.uniforms.uPower.value = (st.power * (.85 + (reduced ? 0 : .15 * Math.sin(time * 2.1))) + st.pulse * .8) * occupied;
      stage.motes.material.uniforms.uPower.value = st.power;
      stage.light.intensity = (stage.guardian ? 2.2 : 26) * st.power + st.pulse * (stage.guardian ? 1.5 : 30);
      st.pulse *= reduced ? 0 : Math.exp(-dt * 3);
      for (const portal of hubPortals) {
        const target = st.intro ? 0 : 1 - hubSmooth(0, HUB_STEP * .9, Math.abs(hubWrap(yaw - portal.yaw)));
        portal.focus += (target - portal.focus) * ease(10);
        portal.flash *= reduced ? 0 : Math.exp(-dt * 3.4);
        const ig = portal.ignite, f = portal.focus;
        portal.lifted.position.y = portal.lift + (reduced ? 0 : Math.sin(time * .9 + portal.phase) * .07);
        portal.lifted.scale.setScalar(1 + .05 * f + .03 * portal.flash);
        portal.apply(ig, f, portal.flash);
        portal.pedRingMat.color.copy(portal.accent).multiplyScalar(.25 + ig * (.35 + .9 * f));
        portal.columnMat.uniforms.uPower.value = ig * (.3 + .8 * f) + portal.flash;
        floorRef.portalPos[portal.index].z = ig * (.25 + .75 * f) + portal.flash;
      }
    }
    function busy() {
      if (st.intro || st.dragging || st.yaw !== st.target || st.push < 1 || st.pulse > .005) return true;
      if (Math.abs(st.dist - st.distTarget) > 1e-3 || Math.abs(st.look - st.lookTarget) > 1e-3) return true;
      return hubPortals.some(portal => portal.flash > .01 ||
        Math.abs(portal.focus - (1 - hubSmooth(0, HUB_STEP * .9, Math.abs(hubWrap(st.yaw - portal.yaw))))) > .002);
    }
    if (!st.intro) { ui.show(); ui.announce(0); }
    return {update, busy, focus, step, enterFocused, reset: () => focus(0)};
  }

  // Subtle bloom: chrome highlights, glowing seams and halos bleed soft light the way
  // the concept renders do. Phone-sized drawing buffers only (an iPad-sized HDR
  // multisample buffer costs too much memory); it needs renderable half-float colour
  // and is dropped if the device can't keep up. Without it the hub still glows
  // through its additive halos.
  const HUB_BLOOM = {strength: .5, radius: .62, threshold: .8, maxPixels: 2.1e6};
  function createHubBloom() {
    const ratio = renderer.getPixelRatio();
    if (viewWidth * viewHeight * ratio * ratio > HUB_BLOOM.maxPixels) return null;
    if (!renderer.extensions.has('EXT_color_buffer_float') && !renderer.extensions.has('EXT_color_buffer_half_float')) return null;
    let composer = null;
    try {
      // One 4x multisampled HDR buffer: the output pass never swaps, so the composer's
      // second buffer is never allocated.
      composer = new EffectComposer(renderer, new T.WebGLRenderTarget(viewWidth, viewHeight, {type: T.HalfFloatType, samples: 4}));
      composer.setPixelRatio(ratio);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new UnrealBloomPass(new T.Vector2(viewWidth, viewHeight), HUB_BLOOM.strength, HUB_BLOOM.radius, HUB_BLOOM.threshold));
      const output = new OutputPass(); output.needsSwap = false; composer.addPass(output);
      renderer.setRenderTarget(composer.readBuffer);
      const gl = renderer.getContext(), complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      renderer.setRenderTarget(null);
      if (!complete) throw new Error('bloom buffer incomplete');
    } catch {
      renderer.setRenderTarget(null);
      composer?.passes.forEach(pass => pass.dispose?.()); composer?.dispose();
      return null;
    }
    document.documentElement.dataset.hubBloom = 'on';
    return {
      render: delta => composer.render(delta),
      resize() {
        const next = renderer.getPixelRatio();
        if (viewWidth * viewHeight * next * next > HUB_BLOOM.maxPixels) return false;
        composer.setPixelRatio(next); composer.setSize(viewWidth, viewHeight); return true;
      },
      dispose() { composer.passes.forEach(pass => pass.dispose?.()); composer.dispose(); document.documentElement.dataset.hubBloom = 'off'; },
    };
  }
  function hubDropBloom() { hubBloom?.dispose(); hubBloom = null; }

  let hubPerfFrames = 0, hubSlowFrames = 0;
  function hubAdaptiveResolution(delta) {
    // Older iPhones: if over half the recent frames miss ~36 fps, step the pixel
    // ratio down (2 → 1.75 → 1.5 → 1.25) instead of dropping frames; still slow at
    // 1.25, drop the bloom.
    if (!delta || document.hidden) return;
    hubPerfFrames++; if (delta > .028) hubSlowFrames++;
    if (hubPerfFrames < 90) return;
    const ratio = renderer.getPixelRatio();
    if (hubSlowFrames > 45 && ratio > 1.26) { renderer.setPixelRatio(Math.max(1.25, ratio - .25)); applyViewport(true); }
    else if (hubSlowFrames > 45 && hubBloom) hubDropBloom();
    hubPerfFrames = hubSlowFrames = 0;
  }
  function applyViewport(force = false) {
    const [w, h] = viewportSize();
    if (!force && w === viewWidth && h === viewHeight) return;
    viewWidth = w; viewHeight = h;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    if (hubBloom && !hubBloom.resize()) hubDropBloom();
    if (immersiveHub) hubFrame();
    if (hubLoopReady) requestDraw();
  }
  function home() {shell();for(const r of[1.8,2.05,2.3])ring(0,2.6,-5,r,.12);ring(0,2.6,-4.85,2.05,.03,amber);sofa(-3,1,.2);sofa(2.2,-1.8,-.4);cylinder(-.6,.55,1.7,1.35,.15,black);cylinder(-.6,.28,1.7,.32,.5,gold);sphere(3.8,1.8,1,.5,blue);ring(3.8,1.8,1,.8,.025,blue);panel('Smart controls','connections',-4,2.7,-2);panel('Rooms & routines','conversation:0',3.8,2.7,-3);panel('Daily check-in','checkins',0,.9,4,amber);}
  function work() {shell(true);plinth(0,-1,3.8);globe(0,3.7,-1,2);cylinder(0,.85,-1,3.4,.6);ring(0,1.2,-1,3.2,.04,blue,true);for(let i=0;i<12;i++){const a=i*Math.PI/6;box(Math.sin(a)*3,1.23,-1+Math.cos(a)*3,.65,.04,.4,blue).rotation.y=a;}['Employment','Businesses','Career','Teams'].forEach((n,i)=>panel(n,i===0?'conversation:0':'connections',(i-1.5)*3,2,2.5,amber,2.6));panel('Connect workplace','connections',0,.85,5,blue,4);sofa(8,-3,-.6);}
  function dreams() {
    stars();skyline();plinth(0,1,4,violet);island(0,1.5,-3,3,green);
    tree(-1.4,-3,green,1.6,.8);
    for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*8,z=Math.sin(a)*7-3,y=2+i%2;
      island(x,y,z,1.6,green);diamond(x,y+1.4,z,.4);
      line([[0,1.6,-3],[x/2,2+i%2/2,(z-3)/2],[x,y+.2,z]],violet,.065);
    }
    arch(0,-4,1.6,violet);
    panel('Film & animation','conversation:0',-3.5,1.3,3.5,violet);
    panel('Creative library','conversation:1',3.5,1.3,3.5,violet);
    panel('Connect creative tools','connections',0,.8,5.2,amber,4);
  }
  function staarverse() {
    // STARVERSE is its own cinematic gaming preview, not a palette swap of Dreams.
    stars();skyline();plinth(0,-1,5.5,blue);
    const gate=new T.Group();gate.position.set(0,3.8,-6.8);scene.add(gate);
    for(const r of[2.25,2.65,3.05]){const halo=ring(0,0,0,r,.08,r===2.65?amber:blue,false,gate);
      animated.push(t=>{if(!reduced)halo.rotation.y=t*(r===2.65?-.14:.12);});
    }
    const core=mesh(new T.IcosahedronGeometry(1.3,2),violet,0,0,0,gate);
    animated.push(t=>{if(!reduced){core.rotation.y=t*.17;core.rotation.x=.2+Math.sin(t*.3)*.1;}});
    for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*10,z=-5+Math.sin(a)*6;
      const y=1.6+(i%3)*.7,accent=[blue,violet,amber][i%3];
      const rock=mesh(new T.DodecahedronGeometry(2,0),black,x,y-.9,z);rock.scale.set(1.2,.58,1.1);
      cylinder(x,y,z,2.25,.18,accent);ring(x,y+.15,z,2.2,.05,gold,true);
      diamond(x,y+1.8,z,.55);
      for(let step=0;step<9;step++){const v=step/8;
        const px=x*v,pz=-5+(z+5)*v;
        box(px,1.05+(y-1.05)*v,pz,.22,.055,.18,accent).rotation.y=a;
      }
      line([[0,1.2,-5],[x*.55,1.5+(y-1.5)*.5,-5+(z+5)*.55],[x,y+.1,z]],accent,.04);
    }
    for(let i=0;i<12;i++){const a=i*Math.PI*2/12,r=3.2;
      sphere(Math.cos(a)*r,1.5,-6.8+Math.sin(a)*r,.09,i%2?amber:blue);
    }
    // "Milo" names a library entrance only; no unapproved Milo character is generated.
    text('STARVERSE · GAME GATEWAY',0,8,-9,11);
    panel('Milo · games library','conversation:0',-4,1.5,3.2,blue,4.6);
    panel('World creation lab','conversation:1',4,1.5,3.2,violet,4.6);
    panel('Connect gaming tools','connections',0,.7,5.7,amber,4.8);
    text('GAME WORLDS IN DEVELOPMENT',0,6.7,-8,8);
    camera.position.set(0,7.4,19);controls.target.set(0,3,-4);
  }
  function health() {floor(14,white);skyline(true);for(const side of[-1,1])for(let i=0;i<4;i++){const x=side*7.5,z=4-i*4;box(x,3,z,3.5,6,3,white);box(x-side*1.8,2.4,z,.06,3.3,2.4,blue);box(x-side*1.84,4.6,z,.08,.4,2.9);tree(side*4.9,z,green,0,.65);}for(let i=-4;i<=4;i++)box(i*.8,.01,1,.4,.025,4);arch(0,-8,2.5,blue);text('STAAR HEALTH',0,5.3,-8,7);box(-.6,3,-7.9,1.6,.4,.2,blue);box(-.6,3,-7.85,.4,1.6,.2,blue);panel('Appointments & care','conversation:2',-3,1.5,3.8);panel('Health resources','connections',3,1.5,3.8);}
  function love() {shell();stars();cylinder(0,.02,0,4.8,.06,ruby);sofa(-3,-.5,.4,ruby);sofa(3,-.5,-.4,ruby);box(0,1.1,-6,4.5,2.2,.7,black);box(0,.8,-5.6,3.5,1,.08,amber);for(let i=0;i<18;i++){const flame=mesh(new T.ConeGeometry(.08,.5+i%4*.1,6),amber,-1.6+i*.19,.8,-5.5);animated.push(t=>{flame.scale.y=reduced?1:.8+Math.sin(t*4+i)*.25;});}const heart=new T.Shape();heart.moveTo(0,.3);heart.bezierCurveTo(-1.5,1.7,-2,-.1,0,-1.2);heart.bezierCurveTo(2,-.1,1.5,1.7,0,.3);mesh(new T.ExtrudeGeometry(heart,{depth:.15,bevelEnabled:true,bevelSize:.08,bevelThickness:.08,bevelSegments:3,steps:1}),ruby,0,3.9,-5.6);for(const x of[-6,6]){box(x,1.3,-3,1.4,2.6,.6,gold);for(let i=0;i<5;i++)cylinder(x-.45+i*.23,2.8,-3,.07,.45,amber);}panel('Connection & conversation','conversation:0',-2.5,1.4,3,amber,4);panel('Community & support','connections',2.5,1.4,3,violet,4);}
  function singlesLounge() {
    shell(); stars();
    // Obsidian lounge, ultraviolet cabaret stage and circular fire pit.
    const leather=material('#100c18',.25,.24), purple=material('#b549ff',.5,.2,'#7b00ff',3);
    sofa(-5,2,.4,leather);sofa(5,2,-.4,leather);
    plinth(0,-5,3.5,purple);arch(0,-5.5,3,purple);
    for(const r of[3.5,4,4.5]) {ring(0,7,-5,r,.13,chrome,true);ring(0,6.84,-5,r-.15,.035,purple,true);}
    for(let i=0;i<44;i++){const a=i*Math.PI*2/44,x=Math.sin(a)*3,z=-5+Math.cos(a)*3;line([[x,6.7,z],[x,4.8-i%5*.13,z]],i%3?purple:gold,.018);}
    cylinder(0,.55,2,1.9,1.1,gold);cylinder(0,1.12,2,1.65,.08,black);ring(0,1.2,2,1.65,.04,amber,true);
    for(let i=0;i<24;i++){const a=i*2.39996,r=.4+i%4*.22,m=mesh(new T.ConeGeometry(.1,.4+i%5*.12,6),amber,Math.cos(a)*r,1.4,2+Math.sin(a)*r);animated.push(t=>{if(!reduced)m.scale.y=.8+Math.sin(t*3+i)*.2;});}
    // Mirrored bar, bottle shelves and stools are independent mesh objects.
    box(-7,1.3,-4,5,2.6,1.2,black);box(-7,2.65,-4,5.3,.15,1.5,gold);
    for(let y=3.2;y<6;y+=1.05){box(-8,y,-7,4,.1,.65,chrome);for(let i=0;i<10;i++){const x=-9.7+i*.38;cylinder(x,y+.28,-7,.11,.5,i%2?gold:purple);cylinder(x,y+.6,-7,.04,.2,chrome);}}
    for(let i=0;i<4;i++){const x=-8.8+i*1.3;cylinder(x,.8,-2.5,.07,1.6,chrome);cylinder(x,1.6,-2.5,.43,.16,leather);ring(x,.5,-2.5,.3,.035,gold,true);}
    panel('Dating & connections','conversation:0',5,4,-4,purple,4.8);
    panel('Nightlife & solo experiences','connections',5,2.9,-3.8,purple,4.8);
    panel('Advice & real talk','conversation:1',5,1.8,-3.6,purple,4.8);
    text('STAAR LOVE · SINGLES',0,5.7,-8,8);
    camera.position.set(0,5.5,18);controls.target.set(0,2.8,-3);
  }
  function village() {floor(15);skyline();stars();cylinder(0,.8,-4,4.4,1.6).scale.z=.65;ring(0,1.65,-4,4.3,.06,violet,true).scale.y=.65;text('SCOTIABANK ARENA DISTRICT',0,2.6,-3,8);for(let i=0;i<4;i++){const x=(i-1.5)*4;plinth(x,3,1.35);diamond(x,1.2,3,.28);}['Toronto','Brampton','Mississauga','Scarborough'].forEach((n,i)=>panel(n,'connections',(i-1.5)*3.7,2.3,2.5,violet,3.2));for(const x of[-5.5,0,5.5])line([[x,.05,4],[x+1,.05,0],[x,.05,-7]],blue,.035);panel('Events, transit & community','connections',0,.8,6,amber,6);}
  function closet() {shell(true);cylinder(0,.06,0,4.5,.13,white);for(const side of[-1,1]){const x=side*6.5;box(x,2,-2,.09,4,.09);box(x,2,3,.09,4,.09);box(x,4,.5,.09,.09,5.1);for(let i=0;i<7;i++){const z=-1.6+i*.65;line([[x,3.95,z],[x-.45,3.6,z],[x+.45,3.6,z],[x,3.95,z]],gold);box(x,2.6,z,1,1.8,.1,i%3===0?black:white);diamond(x,3.05,z+.07,.07);}}box(0,2.6,-6,4,5,.25);box(0,2.6,-5.84,3.75,4.75,.04,black);text('RISING STAARFORM',0,5.7,-6,7);for(let i=0;i<26;i++){const a=i*Math.PI*2/26,m=sphere(Math.sin(a)*4.5,.16,Math.cos(a)*4.5,.3,white);m.scale.set(1.5,.25,1);animated.push(t=>{if(!reduced)m.position.y=.16+Math.sin(t*.7+i)*.014;});}panel('My wardrobe','conversation:1',-2.5,1.4,4,amber);panel('RSF & shopping tools','connections',2.5,1.4,4,amber);}
  function diggitstaar() {
    shell(true); stars(); skyline();
    plinth(0,-1,4.2,amber); ring(0,2.8,-3.8,3.1,.055,amber,true);
    panel('Client pipeline','connections',-4.3,2.5,-2.2,amber,3.2);
    panel('Campaign studio','conversation:0',0,2.7,-3.1,blue,3.4);
    panel('Short-form production','conversation:1',4.3,2.5,-2.2,amber,3.2);
    panel('Leads & delivery','connections',0,1.1,3.7,blue,4.2);
    text('DIGGITSTAAR · AI CONTENT STUDIO',0,5.8,-7.5,6);
    camera.position.set(0,5.5,18); controls.target.set(0,2.2,-2.5);
  }
  function studio() {shell();stars();for(const x of[-8.5,8.5]){island(x,5.5,-6,2.2,black);tree(x,-6,material('#c56b15'),5.6,.8);waterfall(x-.3,2.6,-4.5,5.6);}plinth(0,-2.5,3);const g=new T.Group();g.position.set(0,3.5,-2.5);scene.add(g);mesh(new T.TorusGeometry(1.7,.16,12,64,Math.PI),chrome,0,0,0,g);for(const s of[-1,1]){cylinder(s*1.7,-.2,0,.65,.35,chrome,g).rotation.z=Math.PI/2;cylinder(s*1.48,-.2,0,.54,.25,material('#5d2e1b',.05,.65),g).rotation.z=Math.PI/2;ring(s*1.9,-.2,0,.45,.025,amber,false,g).rotation.y=Math.PI/2;}animated.push(t=>{if(!reduced)g.rotation.y=t*Math.PI*2/30;});box(0,.8,2.2,10,.3,2.2);for(let i=0;i<30;i++){const x=-4.7+i*.32;box(x,.98,2.6,.04,.03,.65,black);box(x,1.02,2.6+Math.sin(i)*.25,.12,.08,.15,white);for(let j=0;j<3;j++)cylinder(x,1,1.7+j*.18,.035,.06,j%2?blue:amber);}for(const x of[-3.6,0,3.6]){box(x,1.65,1.4,2.7,1.3,.15,black);for(let i=0;i<20;i++)box(x-1.2+i*.126,1.6,1.49,.035,.1+Math.abs(Math.sin(i*2.1+x))*.8,.02,x===0?amber:blue);}for(const x of[-5.6,5.6]){box(x,1.45,1.3,.9,2.9,.8,black);for(const y of[.7,1.5,2.3]){cylinder(x,y,1.73,.28,.05,gold).rotation.x=Math.PI/2;sphere(x,y,1.79,.12,black).scale.z=.4;}}panel('Music library','conversation:0',-4.5,2.4,-2,amber);panel('AI tools & studio','connections',4.5,2.4,-2);panel('Plan a release','conversation:1',0,.7,4.5,amber,4);}
  const previewBaseline=new Set(scene.children);
  ({hub,home,work,creativity:()=>dreams(),wellbeing:health,relationships:()=>singles?singlesLounge():love(),events:village,style:closet,staarverse,staarsonic:studio,diggitstaar})[world]();
  const previewWorldObjects=scene.children.filter(object=>!previewBaseline.has(object));
  function importApprovedWorld() {
    if(world==='hub')return;
    const variant=world==='relationships' ? (singles?'singles':'realm') :
      ({home:'residence',work:'command',creativity:'dream',wellbeing:'health',events:'village',style:'closet',staarverse:'universe',staarsonic:'studio',diggitstaar:'workstation'})[world];
    const qaWorld=worldQaEnabled&&window.STAAR_PRIVATE_WORLDS_QA?.[world+'-'+variant];
    const asset=qaWorld?.internalQaOnly===true&&qaWorld?.productionApproved===false ? qaWorld : window.STAAR_APPROVED_WORLD_ASSETS?.[world+'-'+variant];
    if(!asset?.glbBase64)return;
    if(worldQaEnabled){
      try{worldPhysicsQa=createWorldPhysicsProbe({worldKey:world+'-'+variant,
        modelSha256:asset.modelSha256});}catch{worldPhysicsQa=null;}
    }
    try {
      const raw=atob(asset.glbBase64), bytes=new Uint8Array(raw.length);
      for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
      offlineGltfLoader().parse(bytes.buffer,'',gltf=>{
        if(!gltf?.scene)return;
        if(disposed){disposeModel(gltf.scene);return;}
        const model=gltf.scene;
        const nav=gltf?.parser?.json?.extras?.staarNavigationCandidate;
        // Source Build 201/214 collider archives are Z-up (route is XY and
        // 'sliceZ' denotes avatar height). Convert only explicitly tagged GLBs.
        if(nav && (Array.isArray(nav.sliceZ)||Array.isArray(nav.verticalSliceM)))
          model.rotation.x=-Math.PI/2;
        // Update the rotated scene matrix before computing viewer-space bounds.
        // Build 241: the Z-up source transform must be reflected in centering
        // and scale calculations, not only in the rendered scene.
        model.updateMatrixWorld(true);
        const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3());
        if(!Number.isFinite(size.x+size.y+size.z)||Math.max(size.x,size.y,size.z)<=.01){disposeModel(model);return;}
        const scale=Math.min(20/Math.max(size.x,size.z,.1),12/Math.max(size.y,.1),8);
        model.scale.setScalar(scale);
        const centre=bounds.getCenter(new T.Vector3());
        model.position.set(-centre.x*scale,-bounds.min.y*scale,-centre.z*scale);
        // The owner-approved QA stage is visible on a signed INTERNAL TestFlight build only.
        if(qaWorld)document.querySelector('#title').textContent='WORLD · INTERNAL IPHONE QA';
        // Hide procedural blockouts ONLY if the independently approved full GLB loads.
        for(const item of previewWorldObjects)item.visible=false;
        clickable.length=0;
        importedControls=modelControls(model,world);
        clickable.push(...importedControls.map(control=>control.node));
        scene.add(model);
        modelMotions.push(createModelMotion(model,gltf.animations,{reducedMotion:reduced}));
        // Mobile LODs must load a separately hash-verified collision proxy.
        // If it is missing or cannot parse, never enable free 3D walking.
        const updateWalkStatus=enabled=>{
          addNavigationFallback();
          document.querySelector('#status').textContent=enabled
            ? '3D walking enabled · WASD, arrow keys, or touch controls'
            : '3D world loaded · navigation controls below (walking unavailable)';
          requestDraw();
        };
        if(asset.collisionGlbBase64){
          try{
            const rawProxy=atob(asset.collisionGlbBase64),data=new Uint8Array(rawProxy.length);
            for(let i=0;i<rawProxy.length;i++)data[i]=rawProxy.charCodeAt(i);
            offlineGltfLoader().parse(data.buffer,'',proxy=>{
              if(disposed||!proxy?.scene){if(proxy?.scene)disposeModel(proxy.scene);return;}
              const collisionOnly=proxy.scene;
              collisionOnly.scale.copy(model.scale);
              collisionOnly.rotation.copy(model.rotation);
              collisionOnly.position.copy(model.position);
              collisionOnly.visible=false;scene.add(collisionOnly);
              collisionOnly.updateMatrixWorld(true);
              updateWalkStatus(enableTaggedWalking(model,gltf,collisionOnly));
            },()=>updateWalkStatus(false));
          }catch{updateWalkStatus(false);}
        }else{
          updateWalkStatus(enableTaggedWalking(model,gltf));
        }
        requestDraw();
      },()=>{/* Keep working preview scene when offline GLB parsing fails. */});
    }catch{/* Never lose functional preview navigation on model failure. */}
  }
  importApprovedWorld();
  controls.update();controls.saveState();
  let frame=0,visible=true,firstFrameReady=false,lastFrameAt=null;const start=performance.now();
  hubLoopReady=true;
  function requestDraw(){if(!frame&&visible)frame=requestAnimationFrame(draw);}
  function draw(now){
    frame=0;if(!visible)return;
    try {
      const t=(now-start)/1000;
      const delta=lastFrameAt===null?0:(now-lastFrameAt)/1000;lastFrameAt=now;
      modelMotions.forEach(motion=>motion.update(delta,visible));
      worldPhysicsQa?.frame(now);
      walkController?.tick(Math.max(0,Math.min(delta,.075)));
      animated.forEach(fn=>fn(t));
      if(hubRig){hubRig.update(delta);hubAlignBackdrop();if(!reduced)hubAdaptiveResolution(delta);}else controls.update();
      const renderStart=guardianDeviceQa ? performance.now() : 0;
      if(hubBloom)hubBloom.render(delta);else renderer.render(scene,camera);
      if (guardianArrivalPending) {
        guardianArrivalPending = false;
        report('guardian-arrived');
      }
      if(guardianDeviceQa){
        guardianDeviceQa.recordFrame(performance.now(),performance.now()-renderStart);
        // Count only post-render body-animation frames, not accepted button commands.
        guardianDeviceQa.recordMotionMode(guardianLocomotion?.snapshot().mode,
          guardianLocomotion?.ready===true);
        guardianNeckPoseQa?.sample(performance.now());
        if(guardianNeckPoseQa)guardianDeviceQa.recordNeckPose(guardianNeckPoseQa.snapshot());
      }
      // A scene is ready only after WebGL has successfully drawn its first frame.
      if(!firstFrameReady){firstFrameReady=true;report('ready',{geometry:true,objects:scene.children.length});}
      // Reduce Motion renders on demand; keep drawing only while a gesture or snap is in flight.
      if(!reduced || walkController?.pressedCount() || hubRig?.busy())requestDraw();
    } catch {
      guardianDeviceQa?.failedFrame();
      visible=false;cancelAnimationFrame(frame);frame=0;
      document.querySelector('#reset').hidden=true;
      document.querySelector('#status').textContent='3D rendering failed. Safe world navigation remains available below.';
      addNavigationFallback();report('unavailable');
    }
  }
  controls.addEventListener('change',requestDraw);requestDraw();
  document.addEventListener('visibilitychange',()=>{visible=!document.hidden;if(!visible)guardianFaceMotion?.mute();lastFrameAt=null;if(!visible)cancelAnimationFrame(frame);frame=0;if(visible)requestDraw();});
  // WKWebView does not always fire window 'resize' when React Native changes the
  // web view's frame, so also watch the canvas box itself.
  addEventListener('resize',()=>applyViewport());
  window.visualViewport?.addEventListener('resize',()=>applyViewport());
  if(typeof ResizeObserver==='function')new ResizeObserver(()=>applyViewport()).observe(canvas);
  if(immersiveHub)hubFrame();
  const raycaster=new T.Raycaster();let down=null;const activePointers=new Set();
  // A tap is one short, still, single-finger touch. A second finger (pinch) cancels it.
  canvas.addEventListener('pointerdown',e=>{activePointers.add(e.pointerId);down=activePointers.size===1?[e.clientX,e.clientY,e.timeStamp||performance.now()]:null;});
  canvas.addEventListener('pointercancel',e=>{activePointers.delete(e.pointerId);down=null;});
  const portalFocusPosition=new T.Vector3();
  canvas.addEventListener('pointermove',e=>{
    // The immersive hub rig drives head tracking from focus changes instead.
    if(world!=='hub'||immersiveHub||!guardianHeadTracking?.ready||disposed)return;
    const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;
    raycaster.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,
      -(e.clientY-r.top)/r.height*2+1),camera);
    const hit=raycaster.intersectObjects(clickable,true)[0];
    let node=hit?.object;
    while(node&&!node.userData?.action)node=node.parent;
    if(typeof node?.userData?.action==='string'&&node.userData.action.startsWith('world:')){
      node.getWorldPosition(portalFocusPosition);
      // The locked hub portals sit behind the camera-facing Guardian.
      // Use their on-screen horizontal/vertical bearing, projected onto the
      // camera-facing focus plane, instead of twisting the neck backwards.
      portalFocusPosition.z=camera.position.z;
      guardianHeadTracking.setTargetWorld(portalFocusPosition);
    }else guardianHeadTracking.clearTarget();
    requestDraw();
  });
  canvas.addEventListener('pointerleave',()=>{guardianHeadTracking?.clearTarget();requestDraw();});
  canvas.addEventListener('pointerup',e=>{activePointers.delete(e.pointerId);const origin=down;down=null;if(immersiveHub||!origin||Math.hypot(e.clientX-origin[0],e.clientY-origin[1])>10||(e.timeStamp||performance.now())-origin[2]>600)return;const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=raycaster.intersectObjects(clickable,true)[0];if(hit){if(importedControls.length){const control=hitControl(hit.object,importedControls);if(control)report('select',{action:control.action});}else{let n=hit.object;while(n&&!n.userData.action)n=n.parent;if(n)report('select',{action:n.userData.action});}}});
  document.querySelector('#reset').addEventListener('click',()=>{if(hubRig)hubRig.reset();else controls.reset();requestDraw();});
  document.querySelector('#title').textContent=world==='hub'?'STAARWAARDD · PORTAL HUB':(singles?'STAAR Love · Singles':names[ids.indexOf(world)]);
  document.querySelector('#status').textContent=immersiveHub
    ?'Ten portals surround the Guardian. Swipe to turn the ring; tap the centred portal to enter.'
    :'Drag to explore · pinch or scroll to move closer · tap a labelled control';
  for(const g of clickable){const b=document.createElement('button');b.textContent=g.userData.label;b.addEventListener('click',()=>report('select',{action:g.userData.action}));document.querySelector('#actions').append(b);}
  canvas.addEventListener('webglcontextlost',e=>{worldPhysicsQa?.contextLost();e.preventDefault();visible=false;cancelAnimationFrame(frame);frame=0;document.querySelector('#reset').hidden=true;document.querySelector('#status').textContent='3D rendering stopped. Use the accessible world controls below to continue.';addNavigationFallback();report('unavailable');});
  addEventListener('pagehide',()=>{window.removeEventListener('message',onHostFaceFrame);disposed=true;mountedGuardianFaceSha256=null;visible=false;cancelAnimationFrame(frame);modelMotions.forEach(motion=>motion.dispose());walkController?.dispose();guardianFaceMotion?.dispose();guardianNeckPoseQa?.dispose();controls.dispose();hubDropBloom();disposeModel(scene);env.dispose();renderer.dispose();});
}

