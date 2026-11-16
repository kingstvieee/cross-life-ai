import { AnimationMixer } from 'three';

/** Play authored model motion using active render time, never wall-clock catch-up.
 * In Guardian mode only named idle body clips are eligible; voice morph targets
 * remain owned by the separate audio/identity-approved facial controller.
 */
export function createModelMotion(root, clips = [], { guardian = false, reducedMotion = false } = {}) {
  const mixer = new AnimationMixer(root);
  const actions = [], occupied = new Set();
  let disposed = false;
  if (!reducedMotion) for (const original of clips) {
    if (guardian && !/^(idle|hover|breathing)$/i.test(original.name)) continue;
    const clip = original.clone();
    if (guardian) clip.tracks = clip.tracks.filter(track =>
      !/morphTargetInfluences|jaw|mouth|lip|tongue/i.test(track.name));
    if (!clip.tracks.length || !Number.isFinite(clip.duration) || clip.duration <= 0) continue;
    // Separate exported world actions may animate different objects. Do not
    // blend conflicting transform tracks merely because both clips exist.
    if (clip.tracks.some(track => occupied.has(track.name))) continue;
    clip.tracks.forEach(track => occupied.add(track.name));
    actions.push(mixer.clipAction(clip).play());
  }
  return {
    actionCount: actions.length,
    update(deltaSeconds, visible = true) {
      if (!disposed && visible && Number.isFinite(deltaSeconds) && deltaSeconds > 0)
        mixer.update(Math.min(deltaSeconds, .1));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    },
  };
}

/** Dispose imported textures/material arrays once even when shared by meshes. */
export function disposeModel(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of [object.material].flat().filter(Boolean)) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  textures.forEach(texture => texture.dispose());
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
}
