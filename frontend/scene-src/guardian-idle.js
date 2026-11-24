import {Quaternion, Vector3} from 'three';

/** Procedural breathing and idle weight shift for the Guardian's body joints.
 *
 * The B250 model ships walk/run clips but no idle or breathing clip, so a
 * standing Guardian would otherwise be frozen. This adds a slow breath (chest,
 * spine, shoulders, forearms) and a gentle weight shift (pelvis, spine).
 *
 * It never touches the head, neck, jaw or any facial morph target. Joint axes
 * are taken in the given character frame, so the motion is identical however
 * the stage mount is turned. It writes absolute rest x offset rotations, so it
 * stops writing at once while `busy()` reports that clips or the flight pose
 * own the joints, and blends back in from rest afterwards.
 */
const RIG = 'B230_QA_Joint_';
// [breath pitch, breath roll, sway roll] in radians at full weight.
// Sized to read at hub distance (the Guardian is ~40% of the screen height).
const PROFILE = Object.freeze({
  Pelvis: [0, 0, .02],
  Spine: [.012, 0, -.012],
  Chest: [.03, 0, -.008],
  UpperArm_L: [0, .04, 0],
  UpperArm_R: [0, -.04, 0],
  Forearm_L: [.02, 0, 0],
  Forearm_R: [.02, 0, 0],
});
const BREATHS_PER_SECOND = .23; // about 14 breaths a minute
const SWAY_PER_SECOND = .085;

export function createGuardianIdle(root, frame, {reducedMotion = false, busy = () => false} = {}) {
  const joints = [];
  const step = new Quaternion(), frameInverse = new Quaternion(), world = new Quaternion();
  if (root && frame) {
    frame.updateWorldMatrix(true, true);
    frame.getWorldQuaternion(frameInverse).invert();
    for (const [name, [pitch, roll, sway]] of Object.entries(PROFILE)) {
      const joint = root.getObjectByName(RIG + name);
      if (!joint) continue;
      // Joint orientation relative to the character frame, inverted: maps the
      // frame's right (X) and forward (Z) axes into the joint's local space.
      const inverse = frameInverse.clone().multiply(joint.getWorldQuaternion(world)).invert();
      joints.push({joint, rest: joint.quaternion.clone(), pitch, roll, sway,
        pitchAxis: new Vector3(1, 0, 0).applyQuaternion(inverse).normalize(),
        rollAxis: new Vector3(0, 0, 1).applyQuaternion(inverse).normalize()});
    }
  }
  const ready = joints.length === Object.keys(PROFILE).length && !reducedMotion;
  let time = 0, weight = 0, disposed = false;
  return {
    ready,
    update(seconds, visible = true) {
      if (!ready || disposed || !visible || !Number.isFinite(seconds) || seconds <= 0) return;
      if (busy()) { weight = 0; return; } // clips or the flight pose own the joints this frame
      const dt = Math.min(seconds, .1);
      time += dt;
      weight += (1 - weight) * (1 - Math.exp(-dt / .6));
      const breath = Math.sin(time * Math.PI * 2 * BREATHS_PER_SECOND);
      const sway = Math.sin(time * Math.PI * 2 * SWAY_PER_SECOND + 1.3);
      for (const j of joints) {
        j.joint.quaternion.copy(j.rest)
          .multiply(step.setFromAxisAngle(j.pitchAxis, j.pitch * breath * weight))
          .multiply(step.setFromAxisAngle(j.rollAxis, (j.roll * breath + j.sway * sway) * weight));
      }
    },
    snapshot: () => ({schema: 'staar-guardian-procedural-idle-v1', ready, weight,
      facialTracksDriven: false, headDriven: false}),
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const j of joints) j.joint.quaternion.copy(j.rest);
    },
  };
}
