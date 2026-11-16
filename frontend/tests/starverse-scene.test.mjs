import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../scene-src/worlds.js',import.meta.url),'utf8');
const dreams=source.slice(source.indexOf('function dreams()'),source.indexOf('function staarverse()'));
const gaming=source.slice(source.indexOf('function staarverse()'),source.indexOf('function health()'));
test('STARVERSE has independent geometry, not recoloured Dreams artwork',()=>{
  assert.match(source,/function dreams\(\)/);
  assert.match(source,/function staarverse\(\)/);
  assert.match(source,/staarverse,staarsonic:studio/);
  assert.doesNotMatch(source,/dreams\(true\)/);
  assert.match(dreams,/Film & animation/);
  assert.doesNotMatch(dreams,/Milo · games library/);
  assert.match(gaming,/new T\.IcosahedronGeometry/);
  assert.match(gaming,/new T\.DodecahedronGeometry/);
  assert.match(gaming,/STARVERSE · GAME GATEWAY/);
  assert.match(gaming,/GAME WORLDS IN DEVELOPMENT/);
  assert.match(gaming,/Milo · games library/);
  assert.match(gaming,/World creation lab/);
});
test('STARVERSE cannot activate external devices through rendered scenes',()=>{
  assert.match(gaming,/panel\('Connect gaming tools','connections'/);
  assert.doesNotMatch(gaming,/execute:|unlock-door|remote-control|api\/connections/);
});
