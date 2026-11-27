import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {relationshipNotesMode} from '../src/relationship-notes.ts';

test('relationship notes cannot be selected by untrusted or ambiguous route values', () => {
  const permitted = {user_id:'owner',portals_enabled:['relationships','work']};
  assert.equal(relationshipNotesMode('relationship-notes',permitted),'relationship-notes');
  for(const input of [undefined,'work','relationships','relationship-notes/../work',['relationship-notes']]) {
    assert.equal(relationshipNotesMode(input,permitted),'general');
  }
  for(const account of [null,{...permitted,is_demo:true},{...permitted,portals_enabled:['work']},{...permitted,portal_privacy:{relationships:{access:false}}}]) {
    assert.equal(relationshipNotesMode('relationship-notes',account),'unavailable');
  }
});

test('signed-in Love Realm opens the real permission-checked notes workflow without parallel unrelated reads', () => {
  const portal=readFileSync(new URL('../app/environment.tsx',import.meta.url),'utf8');
  const tools=readFileSync(new URL('../app/guardian-tools.tsx',import.meta.url),'utf8');
  assert.match(portal,/world === 'relationships' && variant === 'realm' && relationshipNotesMode/);
  assert.match(portal,/button\('Relationship notes',[^\n]+pathname: '\/guardian-tools', params: \{ view: 'relationship-notes' \}/);
  assert.match(tools,/if \(relationshipOnly\) \{\s*setRecordsReady\(false\);\s*const memory=await checked\(\x60\/api\/guardian\/life-map\/records\?portal=relationships\x60\);/);
  assert.match(tools,/portal,text:text\.trim\(\),source_id:source\.trim\(\)/);
  assert.match(tools,/!relationshipOnly && <View style=\{s\.tabs\}/);
  assert.match(tools,/mode === 'unavailable'.*Relationship notes are unavailable/s);
  assert.match(tools,/response.status === 401 \|\| response.status === 403/);
  assert.match(tools,/setNotes\(\[\]\); setRecordsReady\(false\)/);
});
