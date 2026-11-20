import { MathUtils, Quaternion, Vector3 } from 'three';

/**
 * Interactive presence controller. This drives ONLY the already receipt-verified
 * full-body Guardian GLB. A poster/photo/video never enters this controller.
 *
 * The virtual camera is the viewer. No front camera, microphone, gaze
 * surveillance, face recognition, network, or device permissions are used.
 * A real body WALK clip is mandatory before the actor can translate.
 */
const HEAD_YAW_LIMIT = 0.27; // about 15.5 degrees per bone, safely within rig bounds
const MAX_STEP = .075;
const WALK_SPEED = 1.65;
const STOP_DISTANCE = 1.4;
const Y_AXIS = new Vector3(0, 1, 0);
const normalizeAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (x, min, max) => Math.min(max, Math.max(min, x));
const finite = n => typeof n === 'number' && Number.isFinite(n);
const safePortal = p => p && finite(p.x) && finite(p.z) && Math.abs(p.x) <= 50 && Math.abs(p.z) <= 50;

export function createGuardianPresence3D(root, {
  camera, locomotion, portals = new Map(), reducedMotion = false,
  onStatus = () => {},
} = {}) {
  if (!root?.isObject3D || !camera?.isCamera) throw new Error('3D actor and camera required');
  // Do not drive a still mesh by sliding it across the screen.
  const canWalk = locomotion?.ready === true && typeof locomotion.setMode === 'function';
  const bodyHome = root.position.clone();
  const portalTargets = portals instanceof Map ? portals : new Map(Object.entries(portals));
  const taggedGazeBones = [];
  root.traverse(node => {
    // All authored gaze axes must be tagged by the character rigger.
    // Never guess a neck-bone basis or modify mouth/face morph targets.
    if (node.isBone && node.userData?.staarGazeAxis === 'localY' &&
      ['head', 'neck'].includes(String(node.userData?.staarGazeRole || '').toLowerCase())) {
      taggedGazeBones.push({ node, base: node.quaternion.clone(), current: 0 });
    }
  });
  let state = 'idle', target = null, arrival = null, disabled = false;
  let requestedLookX = 0;
  let lookUntil = 0;
  const offset = new Quaternion();
  const face = (yaw, dt, speed = 2.6) => {
    const difference = normalizeAngle(yaw - root.rotation.y);
    root.rotation.y += clamp(difference, -speed * dt, speed * dt);
  };
  const yawTo = point => Math.atan2(point.x - root.position.x, point.z - root.position.z);
  const faceCamera = dt => {
    const desired = yawTo(camera.position);
    face(desired, dt, .8);
    const eyeCorrection = clamp(normalizeAngle(desired - root.rotation.y) + requestedLookX,
      -HEAD_YAW_LIMIT, HEAD_YAW_LIMIT);
    for (const bone of taggedGazeBones) {
      bone.current = MathUtils.damp(bone.current, eyeCorrection / taggedGazeBones.length, 7, dt);
      bone.node.quaternion.copy(bone.base).multiply(offset.setFromAxisAngle(Y_AXIS, bone.current));
    }
  };
  const resetGaze = () => {
    for (const bone of taggedGazeBones) bone.node.quaternion.copy(bone.base);
  };
  return {
    get ready() { return canWalk && !disabled; },
    get state() { return state; },
    get taggedGazeBones() { return taggedGazeBones.length; },
    /** Portal actions are deferred until the rig physically reaches the doorway. */
    approachPortal(id, callback) {
      if (disabled || reducedMotion || !canWalk || state !== 'idle' ||
        typeof id !== 'string' || !portalTargets.has(id) || typeof callback !== 'function') return false;
      const next = portalTargets.get(id);
      if (!safePortal(next) || locomotion.setMode('walk') !== true) return false;
      const start = root.position.clone();
      if (Math.hypot(next.x - start.x, next.z - start.z) > 32) {
        locomotion.setMode('idle'); return false;
      }
      target = { x: next.x, z: next.z };
      arrival = callback;
      state = 'walking';
      onStatus({ state, portal: id });
      return true;
    },
    /** Direct pointer gestures redirect his *gaze*; they never capture a face. */
    lookTowardScreen(normalizedX) {
      if (!finite(normalizedX) || Math.abs(normalizedX) > 1) return false;
      requestedLookX = normalizedX * .16;
      lookUntil = 1.8;
      return true;
    },
    update(deltaSeconds, visible = true) {
      if (disabled || !visible || !finite(deltaSeconds) || deltaSeconds <= 0) return;
      const dt = Math.min(deltaSeconds, MAX_STEP);
      if (lookUntil > 0) lookUntil -= dt;
      else requestedLookX = MathUtils.damp(requestedLookX, 0, 3, dt);
      if (state === 'walking' && target) {
        const distance = Math.hypot(target.x - root.position.x, target.z - root.position.z);
        face(yawTo(target), dt);
        if (distance <= STOP_DISTANCE) {
          state = 'idle'; target = null;
          locomotion.setMode('idle');
          resetGaze();
          const callback = arrival; arrival = null;
          onStatus({ state: 'arrived' });
          callback?.();
          return;
        }
        const step = Math.min(WALK_SPEED * dt, Math.max(distance - STOP_DISTANCE, 0));
        // No vertical or teleport movement: clip drives legs, controller drives root translation.
        root.position.x += (target.x - root.position.x) / distance * step;
        root.position.z += (target.z - root.position.z) / distance * step;
        return;
      }
      faceCamera(dt);
    },
    cancel() {
      target = null; arrival = null; state = 'idle';
      if (canWalk) locomotion.setMode('idle');
      root.position.copy(bodyHome);
      resetGaze();
    },
    dispose() {
      if (disabled) return;
      this.cancel(); disabled = true;
    },
    snapshot() {
      return { state, bodyMovementReady: canWalk && !disabled,
        gazeRigTagged: taggedGazeBones.length > 0,
        gazeUsesVirtualCameraOnly: true, facialMorphTargetsAltered: false,
        physicalIphoneCertified: false };
    },
  };
}
