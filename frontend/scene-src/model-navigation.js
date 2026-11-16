import { fallbackActions } from './navigation.js';

// GLTFLoader preserves authored glTF extras in userData. Assets may request only
// actions already exposed by this world's accessible controls, never arbitrary URLs.
export function modelControls(root, world) {
  const allowed = new Set(fallbackActions(world).map(([, action]) => action));
  const controls = [];
  root.traverse(node => {
    const action = node.userData?.staarAction;
    if (typeof action !== 'string' || !allowed.has(action)) return;
    const label = node.userData?.staarLabel;
    controls.push({ node, action, label: typeof label === 'string' && label.trim() ? label.trim().slice(0, 100) : fallbackActions(world).find(([, a]) => a === action)[0] });
  });
  return controls;
}

// Resolve only registered ancestors. A mesh's arbitrary extras cannot override
// a registered control, and the nearest explicit control wins when nested.
export function hitControl(object, controls) {
  const registered = new Map(controls.map(control => [control.node, control]));
  for (let node = object; node; node = node.parent) {
    if (registered.has(node)) return registered.get(node);
  }
  return null;
}
