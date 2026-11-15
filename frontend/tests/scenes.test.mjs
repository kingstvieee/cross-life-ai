import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SCENE_IDS, sceneAction } from '../src/scene-policy.ts';

test('scene messages cannot dispatch arbitrary routes, services or cross-world actions', () => {
  for (const value of ['https://example.com', 'home.unlock', 'work.teams.extra', 'world.settings', 'home.lighting', {}, null, 'x'.repeat(2000)]) assert.equal(sceneAction('work', value), null);
  assert.deepEqual(sceneAction('work', 'work.teams'), { world: 'work', area: 'teams' });
  assert.deepEqual(sceneAction('hub', 'world.work'), { world: 'work' });
  assert.equal(sceneAction('hub', 'world.singles'), null);
  assert.deepEqual(sceneAction('singles', 'relationships.connect'), { world: 'relationships', area: 'connect' });
});

test('every scene is a real bounded GLB mesh with hashed provenance and valid hotspots', () => {
  const base = new URL('../assets/3d/', import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('geometry-manifest.json', base)));
  assert.deepEqual(manifest.map(x => x.world).sort(), [...SCENE_IDS].sort());
  for (const entry of manifest) {
    const bytes = readFileSync(new URL(entry.file, base));
    assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
    assert.equal(bytes.readUInt32LE(4), 2); assert.equal(bytes.readUInt32LE(8), bytes.length);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
    assert.ok(bytes.length < 5_000_000, entry.world + ' exceeds review asset budget');
    const document = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)).trim());
    assert.ok(document.meshes.length > 20); assert.ok(document.cameras.length > 0);
    assert.ok(document.accessors.every(a => !a.count || a.count < 1_000_000));
    const actions = document.nodes.flatMap(n => n.extras?.staar_action ? [n.extras.staar_action] : []);
    assert.ok(actions.length >= 4); assert.ok(actions.every(a => sceneAction(entry.world, a)));
    assert.equal(entry.status, 'geometry_review_required');
    assert.ok(!document.images?.length, 'Reference pictures must not masquerade as geometry');
  }
});
