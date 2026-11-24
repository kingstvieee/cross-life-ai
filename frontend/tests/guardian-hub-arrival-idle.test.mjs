import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Bone, Group} from '../scene-src/node_modules/three/build/three.module.js';
import {createGuardianIdle} from '../scene-src/guardian-idle.js';

const rig = () => {
  const root = new Group(), frame = new Group();
  frame.add(root);
  const bone = (name, parent) => { const b = new Bone(); b.name = name; b.position.y = .2; parent.add(b); return b; };
  const pelvis = bone('B230_QA_Joint_Pelvis', root), spine = bone('B230_QA_Joint_Spine', pelvis);
  const chest = bone('B230_QA_Joint_Chest', spine), neck = bone('B230_QA_Joint_Neck', chest);
  const head = bone('STAAR_Guardian_Head', neck);
  for (const side of ['L', 'R']) {
    const upper = bone('B230_QA_Joint_UpperArm_' + side, chest);
    bone('B230_QA_Joint_Forearm_' + side, upper);
  }
  frame.updateMatrixWorld(true);
  return {root, frame, chest, neck, head};
};

test('Guardian breathing moves the body but never the head, neck or face', () => {
  const {root, frame, chest, neck, head} = rig();
  const idle = createGuardianIdle(root, frame);
  assert.equal(idle.ready, true);
  const headBefore = head.quaternion.clone(), neckBefore = neck.quaternion.clone();
  for (let i = 0; i < 60; i++) idle.update(1 / 30);
  assert.ok(chest.quaternion.angleTo(chest.quaternion.clone().identity()) > 1e-4, 'chest breathes');
  assert.ok(head.quaternion.equals(headBefore), 'head untouched');
  assert.ok(neck.quaternion.equals(neckBefore), 'neck untouched');
  assert.equal(idle.snapshot().facialTracksDriven, false);
  idle.dispose();
  assert.ok(chest.quaternion.angleTo(chest.quaternion.clone().identity()) < 1e-9, 'dispose restores the rest pose');
});

test('Guardian breathing yields completely while clips or the flight own the body', () => {
  const {root, frame, chest} = rig();
  let busy = true;
  const idle = createGuardianIdle(root, frame, {busy: () => busy});
  const before = chest.quaternion.clone();
  for (let i = 0; i < 30; i++) idle.update(1 / 30);
  assert.ok(chest.quaternion.equals(before), 'no writes while busy');
  busy = false;
  idle.update(1 / 30);
  assert.ok(idle.snapshot().weight < .1, 'blends back in from rest instead of snapping');
  assert.equal(createGuardianIdle(root, frame, {reducedMotion: true}).ready, false, 'Reduce Motion keeps him still');
});

test('Hub Guardian flies in, lands on the pedestal, and tracks the portals', async () => {
  const scene = await readFile(new URL('../scene-src/worlds.js', import.meta.url), 'utf8');
  assert.match(scene, /function hubGuardianArrival\(\)/);
  assert.match(scene, /const HUB_GUARDIAN_FLIGHT = \{start: [\d.]+, seconds: [\d.]+, settle: [\d.]+\}/);
  assert.match(scene, /if \(reduced\) \{ land\(\); return; \}/);
  assert.match(scene, /trackPortal\(st\.dragging \? live : st\.focus\)/);
  assert.match(scene, /createGuardianIdle\(guardian,hubGuardianFlight\.flight/);
});
