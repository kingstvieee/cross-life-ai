import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('device QA UI does not claim certified GLBs from unverified renderer telemetry',async()=>{
 const src=await readFile(new URL('../components/staarwardd/world-scene.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(src,/with approved GLB/);
 assert.match(src,/reporting model-bound telemetry \(not certified\)/);
 assert.match(src,/Share\.share/);
});
