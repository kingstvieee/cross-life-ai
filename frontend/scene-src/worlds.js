import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createModelMotion, disposeModel } from './model-motion.js';
import { modelControls, hitControl } from './model-navigation.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { worldIds, worldNames, fallbackActions } from './navigation.js';

const ids = worldIds;
const names = worldNames;
const requested = window.STAAR_WORLD || new URLSearchParams(location.search).get('world') || 'hub';
const world = ['hub', ...ids].includes(requested) ? requested : 'hub';
const singles = world === 'relationships' && (window.STAAR_VARIANT || new URLSearchParams(location.search).get('variant')) === 'singles';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.querySelector('canvas');
const session = window.STAAR_SCENE_SESSION || '';
const report = (type, data = {}) => {
  const event = { source: 'staar-scene-v1', world, session, type, ...data };
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(event));
  else parent.postMessage(event, '*');
};
const addNavigationFallback = () => {
  const actions = document.querySelector('#actions');
  if (!actions) return;
  actions.replaceChildren();
  for (const [label, action] of fallbackActions(world)) {
    const button = document.createElement('button');
    button.textContent = label;
    button.addEventListener('click', () => report('select', { action }));
    actions.append(button);
  }
};
let renderer;
try { renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' }); }
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
  scene.fog = new T.Fog(scene.background, 38, 150);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const room = new RoomEnvironment(), pmrem = new T.PMREMGenerator(renderer);
  const env = pmrem.fromScene(room, .04); scene.environment = env.texture; room.dispose(); pmrem.dispose();
  scene.add(new T.HemisphereLight('#d6edff', '#392818', bright ? 3 : 1.6));
  for (const [color, intensity, position] of [['#fff3dc',4,[6,15,9]],['#5daeff',2,[-10,5,-5]]]) {
    const light = new T.DirectionalLight(color, intensity); light.position.set(...position); scene.add(light);
  }
  const camera = new T.PerspectiveCamera(48, innerWidth / innerHeight, .1, 180);
  camera.position.set(0,5.6,17);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0,2.2,-1); controls.enableDamping = !reduced;
  controls.minDistance = 3; controls.maxDistance = 28; controls.maxPolarAngle = Math.PI*.48;
  const animated = [], clickable = [], modelMotions = [];
  let disposed = false;
  let importedControls = [];
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
    const asset=window.STAAR_APPROVED_GUARDIAN_MODEL;
    if (!asset?.glbBase64 || asset.sourceImageSha256!=='d7f18158a91778a7f3ce97c7326b1c75afefdc792c77ab02c4fead0e3ffa659c') return;
    try {
      const decoded=atob(asset.glbBase64);
      const bytes=new Uint8Array(decoded.length);
      for(let i=0;i<decoded.length;i++)bytes[i]=decoded.charCodeAt(i);
      new GLTFLoader().parse(bytes.buffer,'',model=>{
        if(!model?.scene)return;
        if(disposed){disposeModel(model.scene);return;}
        const guardian=model.scene;
        const bounds=new T.Box3().setFromObject(guardian);
        const dimensions=bounds.getSize(new T.Vector3());
        if(!Number.isFinite(dimensions.y)||dimensions.y<=.01||dimensions.y>10000){disposeModel(guardian);return;}
        const scale=Math.min(3.65/dimensions.y,4.5/Math.max(dimensions.x,dimensions.z,.1));
        guardian.scale.setScalar(scale);
        // Centre approved full armour above the existing Guardian plinth, never crop the emblem.
        const centre=bounds.getCenter(new T.Vector3());
        guardian.position.set(-centre.x*scale,.6-bounds.min.y*scale,1.5-centre.z*scale);
        scene.add(guardian);
        modelMotions.push(createModelMotion(guardian,model.animations,{guardian:true,reducedMotion:reduced}));
        requestDraw();
      },()=>{/* Never display guessed or partial face geometry on load failure. */});
    } catch { /* The locked Guardian artwork remains the fallback. */ }
  }
  function hub() {
    floor(15);stars();skyline();plinth(0,1.5,3);
    for(const r of[2,2.4,2.8])ring(0,3+(r-2)*2,1.5,r,.022,r<2.5?blue:amber,true);
    for(const x of[-11.5,11.5]){plinth(x,1,1,amber);diamond(x,1.7,1,.8);}
    ids.forEach((id,i)=>{const a=(i-4)*.31,x=Math.sin(a)*11,z=-Math.cos(a)*8,g=arch(x,z,1.55,i%2?blue:amber);g.rotation.y=-a;sphere(0,2.6,-.1,.65,[blue,amber,violet][i%3],g).scale.z=.45;box(0,.55,.1,2.65,.85,.2,black,g);text(names[i],0,.6,.23,2.5,g);g.userData={action:'world:'+id,label:names[i]};clickable.push(g);cylinder(x,.12,z,1.8,.24);});
    approvedArmoredGuardian();
    text('STAARWARDD',0,7.1,-9,10);text('PORTAL HUB',0,6.3,-9,5);camera.position.set(0,6,19);controls.target.set(0,2.5,-2);
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
  function studio() {shell();stars();for(const x of[-8.5,8.5]){island(x,5.5,-6,2.2,black);tree(x,-6,material('#c56b15'),5.6,.8);waterfall(x-.3,2.6,-4.5,5.6);}plinth(0,-2.5,3);const g=new T.Group();g.position.set(0,3.5,-2.5);scene.add(g);mesh(new T.TorusGeometry(1.7,.16,12,64,Math.PI),chrome,0,0,0,g);for(const s of[-1,1]){cylinder(s*1.7,-.2,0,.65,.35,chrome,g).rotation.z=Math.PI/2;cylinder(s*1.48,-.2,0,.54,.25,material('#5d2e1b',.05,.65),g).rotation.z=Math.PI/2;ring(s*1.9,-.2,0,.45,.025,amber,false,g).rotation.y=Math.PI/2;}animated.push(t=>{if(!reduced)g.rotation.y=t*Math.PI*2/30;});box(0,.8,2.2,10,.3,2.2);for(let i=0;i<30;i++){const x=-4.7+i*.32;box(x,.98,2.6,.04,.03,.65,black);box(x,1.02,2.6+Math.sin(i)*.25,.12,.08,.15,white);for(let j=0;j<3;j++)cylinder(x,1,1.7+j*.18,.035,.06,j%2?blue:amber);}for(const x of[-3.6,0,3.6]){box(x,1.65,1.4,2.7,1.3,.15,black);for(let i=0;i<20;i++)box(x-1.2+i*.126,1.6,1.49,.035,.1+Math.abs(Math.sin(i*2.1+x))*.8,.02,x===0?amber:blue);}for(const x of[-5.6,5.6]){box(x,1.45,1.3,.9,2.9,.8,black);for(const y of[.7,1.5,2.3]){cylinder(x,y,1.73,.28,.05,gold).rotation.x=Math.PI/2;sphere(x,y,1.79,.12,black).scale.z=.4;}}panel('Music library','conversation:0',-4.5,2.4,-2,amber);panel('AI tools & studio','connections',4.5,2.4,-2);panel('Plan a release','conversation:1',0,.7,4.5,amber,4);}
  const previewBaseline=new Set(scene.children);
  ({hub,home,work,creativity:()=>dreams(),wellbeing:health,relationships:()=>singles?singlesLounge():love(),events:village,style:closet,staarverse,staarsonic:studio})[world]();
  const previewWorldObjects=scene.children.filter(object=>!previewBaseline.has(object));
  function importApprovedWorld() {
    if(world==='hub')return;
    const variant=world==='relationships' ? (singles?'singles':'realm') :
      ({home:'residence',work:'command',creativity:'dream',wellbeing:'health',events:'village',style:'closet',staarverse:'universe',staarsonic:'studio'})[world];
    const asset=window.STAAR_APPROVED_WORLD_ASSETS?.[world+'-'+variant];
    if(!asset?.glbBase64)return;
    try {
      const raw=atob(asset.glbBase64), bytes=new Uint8Array(raw.length);
      for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
      new GLTFLoader().parse(bytes.buffer,'',gltf=>{
        if(!gltf?.scene)return;
        if(disposed){disposeModel(gltf.scene);return;}
        const model=gltf.scene,bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3());
        if(!Number.isFinite(size.x+size.y+size.z)||Math.max(size.x,size.y,size.z)<=.01){disposeModel(model);return;}
        const scale=Math.min(20/Math.max(size.x,size.z,.1),12/Math.max(size.y,.1),8);
        model.scale.setScalar(scale);
        const centre=bounds.getCenter(new T.Vector3());
        model.position.set(-centre.x*scale,-bounds.min.y*scale,-centre.z*scale);
        // Hide procedural blockouts ONLY if the independently approved full GLB loads.
        for(const item of previewWorldObjects)item.visible=false;
        clickable.length=0;
        importedControls=modelControls(model,world);
        clickable.push(...importedControls.map(control=>control.node));
        scene.add(model);
        modelMotions.push(createModelMotion(model,gltf.animations,{reducedMotion:reduced}));
        addNavigationFallback();
        document.querySelector('#status').textContent='Approved 3D world loaded · use the controls below to explore';
        requestDraw();
      },()=>{/* Keep working preview scene when offline GLB parsing fails. */});
    }catch{/* Never lose functional preview navigation on model failure. */}
  }
  importApprovedWorld();
  controls.update();controls.saveState();
  let frame=0,visible=true,firstFrameReady=false,lastFrameAt=null;const start=performance.now();
  function requestDraw(){if(!frame&&visible)frame=requestAnimationFrame(draw);}
  function draw(now){
    frame=0;if(!visible)return;
    try {
      const t=(now-start)/1000;
      const delta=lastFrameAt===null?0:(now-lastFrameAt)/1000;lastFrameAt=now;
      modelMotions.forEach(motion=>motion.update(delta,visible));
      animated.forEach(fn=>fn(t));controls.update();renderer.render(scene,camera);
      // A scene is ready only after WebGL has successfully drawn its first frame.
      if(!firstFrameReady){firstFrameReady=true;report('ready',{geometry:true,objects:scene.children.length});}
      if(!reduced)requestDraw();
    } catch {
      visible=false;cancelAnimationFrame(frame);frame=0;
      document.querySelector('#reset').hidden=true;
      document.querySelector('#status').textContent='3D rendering failed. Safe world navigation remains available below.';
      addNavigationFallback();report('unavailable');
    }
  }
  controls.addEventListener('change',requestDraw);requestDraw();
  document.addEventListener('visibilitychange',()=>{visible=!document.hidden;lastFrameAt=null;if(!visible)cancelAnimationFrame(frame);frame=0;if(visible)requestDraw();});
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);requestDraw();});
  const raycaster=new T.Raycaster();let down=null;
  canvas.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
  canvas.addEventListener('pointercancel',()=>{down=null;});
  canvas.addEventListener('pointerup',e=>{const origin=down;down=null;if(!origin||Math.hypot(e.clientX-origin[0],e.clientY-origin[1])>7)return;const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=raycaster.intersectObjects(clickable,true)[0];if(hit){if(importedControls.length){const control=hitControl(hit.object,importedControls);if(control)report('select',{action:control.action});}else{let n=hit.object;while(n&&!n.userData.action)n=n.parent;if(n)report('select',{action:n.userData.action});}}});
  document.querySelector('#reset').addEventListener('click',()=>{controls.reset();requestDraw();});
  document.querySelector('#title').textContent=world==='hub'?'STAARWARDD · PORTAL HUB':(singles?'STAAR Love · Singles':names[ids.indexOf(world)]);
  document.querySelector('#status').textContent='Drag to explore · pinch or scroll to move closer · tap a labelled control';
  for(const g of clickable){const b=document.createElement('button');b.textContent=g.userData.label;b.addEventListener('click',()=>report('select',{action:g.userData.action}));document.querySelector('#actions').append(b);}
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();visible=false;cancelAnimationFrame(frame);frame=0;document.querySelector('#reset').hidden=true;document.querySelector('#status').textContent='3D rendering stopped. Use the accessible world controls below to continue.';addNavigationFallback();report('unavailable');});
  addEventListener('pagehide',()=>{disposed=true;visible=false;cancelAnimationFrame(frame);modelMotions.forEach(motion=>motion.dispose());controls.dispose();disposeModel(scene);env.dispose();renderer.dispose();});
}
