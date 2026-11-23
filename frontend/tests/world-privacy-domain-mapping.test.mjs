import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const frontend=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(path.join(frontend,'lib/staarwardd/world-directory.ts'),'utf8');
const backend=readFileSync(path.join(frontend,'../backend/server.py'),'utf8');
const identity=readFileSync(path.join(frontend,'../backend/identity_routes.py'),'utf8');

test('all ten immersive destinations have explicit privacy-domain policy without implicit access expansion',()=>{
  const expected=['creativity','work','home','wellbeing','relationships','events','style','staarsonic','staarverse','diggitstaar'];
  for(const key of expected) assert.match(source,new RegExp('\\b'+key+': '),key);
  assert.match(source,/satisfies Record<WorldId, string \| undefined>/);
});
test('STAAR Village events maps to the authorized legacy community domain',()=>{
  assert.match(source,/events: 'community'/);
  assert.match(source,/portal: WORLD_TO_BACKEND_PORTAL\[world as WorldId\]/);
  assert.match(backend, /"id": "community"/);
  assert.match(identity, /"community"/);
});
test('no unapproved new account permission domain is invented for preview-only worlds',()=>{
 for(const w of ['staarsonic','staarverse','diggitstaar']){
  assert.match(source,new RegExp(w+': undefined'));
 }
 assert.match(source,/global scope until a dedicated data\/privacy/);
});
