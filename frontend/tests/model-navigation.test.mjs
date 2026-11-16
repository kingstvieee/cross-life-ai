import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Mesh } from '../scene-src/node_modules/three/build/three.module.js';
import { modelControls, hitControl } from '../scene-src/model-navigation.js';

test('authored glTF controls route nested hit geometry to the world allowlist', () => {
  const root=new Group(), panel=new Group(), mesh=new Mesh();
  root.add(panel);panel.add(mesh);
  panel.userData={staarAction:'connections',staarLabel:'Smart home'};
  mesh.userData={action:'https://attacker.example'};
  const controls=modelControls(root,'home');
  assert.equal(controls.length,1);
  assert.equal(hitControl(mesh,controls).action,'connections');
  assert.equal(hitControl(mesh,controls).label,'Smart home');
  assert.equal(hitControl(new Group(),controls),null);
});
test('foreign world actions, arbitrary URLs and malformed asset metadata are ignored', () => {
  const root=new Group();
  for(const action of ['checkins','world:home','javascript:alert(1)','https://example.com',{},null]) {
    const node=new Group();node.userData={staarAction:action};root.add(node);
  }
  assert.deepEqual(modelControls(root,'work'),[]);
  assert.equal(modelControls(root,'home').length,1);
  assert.deepEqual(modelControls(root,'unknown'),[]);
});
test('nearest registered control wins and label remains bounded with a readable fallback', () => {
  const root=new Group(), outer=new Group(), inner=new Group(), leaf=new Mesh();
  root.add(outer);outer.add(inner);inner.add(leaf);
  outer.userData={staarAction:'connections',staarLabel:'x'.repeat(1000)};
  inner.userData={staarAction:'checkins',staarLabel:'  '};
  const controls=modelControls(root,'home');
  assert.equal(controls[0].label.length,100);
  assert.equal(hitControl(leaf,controls).action,'checkins');
  assert.equal(hitControl(leaf,controls).label,'Daily check-in');
});
