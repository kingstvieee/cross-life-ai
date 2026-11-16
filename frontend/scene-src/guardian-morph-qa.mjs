/** Binary-backed structural QA of locked Guardian facial shapes.
 * NOT proof of identity, natural speech, texture fidelity or physical-device acceptance.
 */
export const LOCKED_GUARDIAN_MORPHS = Object.freeze(['rest','sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U']);
const SPEECH = LOCKED_GUARDIAN_MORPHS.filter(name => name !== 'rest' && name !== 'sil');
const bad = reason => { throw new Error('guardian_morph_' + reason); };
const MAX_VERTICES = 250000;

function getDelta(gltf, bin, accessorIndex, expectedCount) {
  const accessor = gltf.accessors?.[accessorIndex];
  if (!accessor || accessor.sparse || accessor.componentType !== 5126 || accessor.type !== 'VEC3' ||
      accessor.count !== expectedCount || expectedCount < 3 || expectedCount > MAX_VERTICES ||
      !Number.isInteger(accessor.bufferView) || !Number.isInteger(accessor.byteOffset ?? 0)) bad('unsupported_accessor');
  const view = gltf.bufferViews?.[accessor.bufferView];
  if (!view || view.buffer !== 0 || !Number.isInteger(view.byteLength) ||
      !Number.isInteger(view.byteOffset ?? 0)) bad('invalid_buffer_view');
  const stride = view.byteStride ?? 12;
  const relative = accessor.byteOffset ?? 0;
  const offset = (view.byteOffset ?? 0) + relative;
  if (!Number.isInteger(stride) || stride < 12 || stride > 4096 ||
      offset < 0 || relative + (expectedCount - 1) * stride + 12 > view.byteLength ||
      offset + (expectedCount - 1) * stride + 12 > bin.length) bad('accessor_bounds');
  const values = new Float32Array(expectedCount * 3);
  let nonzero = 0, energy = 0;
  for (let i = 0; i < expectedCount; i++) {
    const position = offset + i * stride;
    let vertexMoved = false;
    for (let k = 0; k < 3; k++) {
      const value = bin.readFloatLE(position + k * 4);
      if (!Number.isFinite(value) || Math.abs(value) > 10) bad('nonfinite_or_extreme_delta');
      values[i * 3 + k] = value;
      energy += value * value;
      if (Math.abs(value) > 0.00001) vertexMoved = true;
    }
    if (vertexMoved) nonzero++;
  }
  return {values, energy, nonzero};
}

/** Requires 14 nonempty, geometrically distinguishable speech shapes.
 * Rest/silence may remain neutral. Cryptographic/provenance and device gates are separate.
 */
export function inspectGuardianMorphGeometry(gltf, bin) {
  if (!Buffer.isBuffer(bin) || !gltf || typeof gltf !== 'object') bad('missing_input');
  let chosen = null;
  for (const mesh of gltf.meshes ?? []) {
    const names = mesh?.extras?.targetNames;
    if (!Array.isArray(names) || LOCKED_GUARDIAN_MORPHS.some(n => !names.includes(n))) continue;
    if (new Set(names).size !== names.length || names.length !== LOCKED_GUARDIAN_MORPHS.length)
      bad('duplicate_or_extra_names');
    for (const primitive of mesh.primitives ?? []) {
      if (!Array.isArray(primitive.targets) || primitive.targets.length !== names.length) continue;
      const accessor = gltf.accessors?.[primitive.attributes?.POSITION];
      if (!accessor || !Number.isInteger(accessor.count)) continue;
      const vectors = new Map(), independentIds = new Set();
      for (const label of SPEECH) {
        const index = names.indexOf(label), targetAccessor = primitive.targets[index]?.POSITION;
        if (!Number.isInteger(targetAccessor) || independentIds.has(targetAccessor))
          bad('duplicate_target_accessor');
        independentIds.add(targetAccessor);
        const result = getDelta(gltf, bin, targetAccessor, accessor.count);
        if (result.nonzero < 2 || result.energy < 1e-9) bad('silent_speech_target_' + label);
        vectors.set(label, result);
      }
      let largestCosine = 0;
      for (let i = 0; i < SPEECH.length; i++) for (let j = i + 1; j < SPEECH.length; j++) {
        const a = vectors.get(SPEECH[i]), b = vectors.get(SPEECH[j]);
        let dot = 0;
        for (let k = 0; k < a.values.length; k++) dot += a.values[k] * b.values[k];
        const cosine = Math.abs(dot / Math.sqrt(a.energy * b.energy));
        if (!Number.isFinite(cosine)) bad('invalid_comparison');
        largestCosine = Math.max(largestCosine, cosine);
      }
      if (largestCosine >= .9999) bad('indistinguishable_speech_targets');
      chosen = {vertexCount: accessor.count, checkedSpeechTargets: SPEECH.length,
        maxAbsSpeechMorphCosine: Number(largestCosine.toFixed(7))};
      break;
    }
    if (chosen) break;
  }
  if (!chosen) bad('no_complete_face_primitive');
  return chosen;
}
