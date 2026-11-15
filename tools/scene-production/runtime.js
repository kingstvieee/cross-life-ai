import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Host supplies only bundled GLB data and a world identifier. No provider tokens,
// network resources or private account content enter this renderer.
const send = value => {
  const message = JSON.stringify({ channel: 'staar-scene-v1', ...value });
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(message);
  else window.parent.postMessage(message, '*');
};
let renderer, controls, scene, camera, paused = false, frame = 0;
const render = () => { frame = 0; if (!paused) renderer.render(scene, camera); };
const invalidate = () => { if (!frame && !paused) frame = requestAnimationFrame(render); };
const dispose = () => {
  cancelAnimationFrame(frame); controls?.dispose();
  scene?.traverse(o => { o.geometry?.dispose(); if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose(); });
  scene?.environment?.dispose(); renderer?.dispose();
};
window.addEventListener('pagehide', dispose, { once: true });
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight); renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1; document.body.appendChild(renderer.domElement);
  scene = new THREE.Scene(); scene.background = new THREE.Color('#080c14');
  const pmrem = new THREE.PMREMGenerator(renderer); const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, .03).texture; room.dispose(); pmrem.dispose();
  camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .1, 120);
  camera.position.set(0, 5, 13); controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 2, -1); controls.minDistance = 3; controls.maxDistance = 23;
  controls.maxPolarAngle = Math.PI / 2 - .04; controls.enableDamping = false; controls.update();
  controls.addEventListener('change', invalidate);
  scene.add(new THREE.HemisphereLight(0xd9ebff, 0x171c29, 2));
  const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(-4, 10, 8); scene.add(light);
  const ray = new THREE.Raycaster(); const pointer = new THREE.Vector2(); let down = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) return;
    down = null; pointer.set(e.clientX / innerWidth * 2 - 1, 1 - e.clientY / innerHeight * 2);
    ray.setFromCamera(pointer, camera);
    for (const hit of ray.intersectObjects(scene.children, true).slice(0, 1)) {
      let object = hit.object;
      while (object && !object.userData.staar_action) object = object.parent;
      if (object) { send({ type: 'action', action: object.userData.staar_action }); break; }
    }
  });
  window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); invalidate(); });
  document.addEventListener('visibilitychange', () => { paused = document.hidden; if (!paused) invalidate(); });
  const visibility = event => {
    if (event.data === 'staar:pause') paused = true;
    if (event.data === 'staar:resume') { paused = false; invalidate(); }
  };
  window.addEventListener('message', visibility); document.addEventListener('message', visibility);
  new GLTFLoader().parse(window.STAAR_MODEL, '', result => {
    scene.add(result.scene); send({ type: 'ready' }); invalidate();
  }, () => send({ type: 'error', message: 'The bundled scene could not be loaded.' }));
} catch { dispose(); send({ type: 'error', message: '3D graphics are unavailable on this device.' }); }
