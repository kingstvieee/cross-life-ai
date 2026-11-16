import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { LOCKED_WORLD_REQUIREMENTS } from '../src/locked-world-acceptance.ts';
const masters = {
  home: 'home.png', work: 'work.png', creativity: 'creativity.png',
  wellbeing: 'wellbeing.png', relationships: 'love.png', events: 'events.png',
  style: 'style.png', staarverse: 'staarverse.png', staarsonic: 'staarsonic.png',
};
test('all nine world references plus the separate Singles realm remain present',()=>{
  assert.deepEqual(Object.keys(masters), Object.keys(LOCKED_WORLD_REQUIREMENTS));
  for (const name of [...Object.values(masters), 'love-singles.png','homepage.png']) {
    const path=new URL('../assets/images/staarwardd/locked/'+name,import.meta.url);
    const sample=readFileSync(path);
    assert.ok(statSync(path).size>1000,name+' is missing or empty');
    assert.equal(sample.subarray(0,8).toString('hex'),'89504e470d0a1a0a',name+' must remain a PNG reference master');
  }
});
test('portal reference masters are not mislabeled as production 3D rigs',()=>{
 const text=readFileSync(new URL('../assets/images/staarwardd/locked/README.md',import.meta.url),'utf8');
 assert.match(text,/approved visual references, not 3D meshes/);
 assert.match(text,/love-singles\.png/);
});
