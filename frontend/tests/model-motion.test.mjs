import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Mesh, BoxGeometry, MeshStandardMaterial, Texture, AnimationClip, NumberKeyframeTrack } from '../scene-src/node_modules/three/build/three.module.js';
import { createModelMotion, disposeModel } from '../scene-src/model-motion.js';

const clip = (name, target, axis='x') => new AnimationClip(name, 1, [new NumberKeyframeTrack(`${target}.position[${axis}]`, [0,1], [0,10])]);
function fixture() {
  const root=new Group(), body=new Group();body.name='Body';root.add(body);
  return {root,body};
}
test('authored world motion moves real Three.js objects and pauses without catch-up',()=>{
  const {root,body}=fixture(), motion=createModelMotion(root,[clip('World','Body')]);
  assert.equal(motion.actionCount,1);
  motion.update(.05);assert.ok(Math.abs(body.position.x-.5)<1e-6);
  motion.update(10,false);assert.ok(Math.abs(body.position.x-.5)<1e-6);
  motion.update(.05);assert.ok(Math.abs(body.position.x-1)<1e-6);
  motion.update(60);assert.ok(Math.abs(body.position.x-2)<1e-6);
  motion.dispose();const stopped=body.position.x;
  motion.update(.1);assert.equal(body.position.x,stopped);
  motion.dispose();
});
test('independent world clips run together; overlapping exported tracks never double-blend',()=>{
  const {root,body}=fixture();
  const motion=createModelMotion(root,[clip('X','Body'),clip('Conflicting X','Body'),clip('Y','Body','y')]);
  assert.equal(motion.actionCount,2);motion.update(.1);
  assert.ok(Math.abs(body.position.x-1)<1e-6);assert.ok(Math.abs(body.position.y-1)<1e-6);
  motion.dispose();
});
test('Guardian idle motion cannot animate voice morphs or jaw without speech timing',()=>{
  const {root,body}=fixture(), jaw=new Group();jaw.name='Jaw';root.add(jaw);
  const idle=clip('Idle','Body');idle.tracks.push(...clip('Jaw','Jaw').tracks);
  idle.tracks.push(new NumberKeyframeTrack('Head.morphTargetInfluences[0]',[0,1],[0,1]));
  const motion=createModelMotion(root,[clip('Speaking','Jaw'),idle],{guardian:true});
  assert.equal(motion.actionCount,1);motion.update(.1);
  assert.ok(body.position.x>0);assert.equal(jaw.position.x,0);motion.dispose();
});
test('reduced motion, invalid deltas and absent animation clips remain still',()=>{
  const {root,body}=fixture(), motion=createModelMotion(root,[clip('World','Body')],{reducedMotion:true});
  assert.equal(motion.actionCount,0);motion.update(.1);assert.equal(body.position.x,0);motion.dispose();
  const enabled=createModelMotion(root,[clip('World','Body')]);
  for(const delta of [NaN,Infinity,-1,0])enabled.update(delta);
  assert.equal(body.position.x,0);enabled.dispose();
  assert.equal(createModelMotion(root,[]).actionCount,0);
});
test('all PBR textures and shared geometry/materials are disposed exactly once',()=>{
  const root=new Group(), geometry=new BoxGeometry(), texture=new Texture();
  const material=new MeshStandardMaterial({map:texture,normalMap:texture});
  root.add(new Mesh(geometry,material),new Mesh(geometry,material));
  const count={geometry:0,material:0,texture:0};
  geometry.addEventListener('dispose',()=>count.geometry++);
  material.addEventListener('dispose',()=>count.material++);
  texture.addEventListener('dispose',()=>count.texture++);
  disposeModel(root);assert.deepEqual(count,{geometry:1,material:1,texture:1});
});
