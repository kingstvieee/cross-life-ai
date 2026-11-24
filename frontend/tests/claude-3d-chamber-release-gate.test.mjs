import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=path=>readFile(new URL(path,import.meta.url),'utf8');

test('3D hub contains ten clickable world portals and a Guardian, not just a placeholder screen',async()=>{
  const [scene,hub,navigation]=await Promise.all([
    source('../scene-src/worlds.js'),
    source('../components/staarwardd/world-hub.tsx'),
    source('../scene-src/navigation.js')
  ]);
  const match=navigation.match(/export const worldIds = \[([^\]]+)\]/);
  assert.ok(match,'world IDs missing');
  const ids=[...match[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
  assert.equal(ids.length,10);
  assert.equal(new Set(ids).size,10);
  assert.match(scene,/ids\.forEach\(\(id, i\) =>/);
  assert.match(scene,/proxy\.userData = \{action: 'world:'\s*\+\s*id/);
  assert.match(scene,/clickable\.push\(proxy\)/);
  assert.match(scene,/approvedArmoredGuardian\(\);/);
  assert.match(scene,/raycaster\.intersectObjects\(clickable,true\)/);
  assert.match(scene,/report\('select',\{action:n\.userData\.action\}\)/);
  assert.match(hub,/onThreeDimensionalPortalAction/);
  assert.match(hub,/if \(onSignIn\) \{ setInspectedPortal\(target\)/);
  assert.match(hub,/else openPortal\(target\.id\)/);
});

test('production remains fail-closed against unapproved private Guardian QA',async()=>{
  const [builder,workflow]=await Promise.all([
    source('../scene-src/build.mjs'),
    source('../../codemagic.yaml')
  ]);
  assert.match(builder,/const privateQaBuild = process\.env\.STAAR_PRIVATE_DEVICE_QA_BUILD === '1'/);
  assert.match(builder,/if \(!privateQaBuild && \(privateGuardianQa \|\| privateWorlds \|\| internalHomeReview\) && !internalTestFlightGuardian\)/);
  assert.match(workflow,/triggering:\s*\n\s*events: \[\]/);
  assert.match(workflow,/submit_to_testflight: true/);
  assert.match(workflow,/testFlightInternalTestingOnly": true/);
  assert.doesNotMatch(workflow,/STAAR_PRIVATE_DEVICE_QA_BUILD:\s*['"]?1/);
});
