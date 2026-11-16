import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { LOCKED_WORLD_REQUIREMENTS } from '../src/locked-world-acceptance.ts';
const lockedGitBlobSha = {
  "homepage.png": "61537108c9016f619ac6a4e7bb0c3dd400a1ce87",
  "home.png": "09c985729210e476a610d3fa2b1130de4b112245",
  "work.png": "e72a7eda6d27e0a12b157bafe82b6379c0a4f882",
  "creativity.png": "9791e2ae043c1ddc39703833747ee377a3b72bdf",
  "wellbeing.png": "e477880f76a25efe1660c4bd0bd61a5a557ebab1",
  "love.png": "b4069bd72889ecd84a92db9869081e23bd165fae",
  "love-singles.png": "194c0a773dbe6987f6996a48bbf711d5a80fb812",
  "events.png": "02ee2e59b3e7c9d785ef2555b0590cd7ae8cad52",
  "style.png": "451ceccaf9408a899b04ea577bba56b82e18b320",
  "staarverse.png": "7c3546950a2756121f0414bdc66acd3b306e9d9a",
  "staarsonic.png": "91f26af6a55257ae11e1852fb1205b834ab51c73"
};
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
    const gitBlobSha = createHash('sha1').update(`blob ${sample.length}\0`).update(sample).digest('hex');
    assert.equal(gitBlobSha, lockedGitBlobSha[name], name+' must match the founder-locked master blob');
  }
});
test('portal reference masters are not mislabeled as production 3D rigs',()=>{
 const text=readFileSync(new URL('../assets/images/staarwardd/locked/README.md',import.meta.url),'utf8');
 assert.match(text,/approved visual references, not 3D meshes/);
 assert.match(text,/love-singles\.png/);
});
