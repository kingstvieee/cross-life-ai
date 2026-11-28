import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LOCKED_WORLD_REQUIREMENTS, allNineWorldsApproved, isLockedWorldApproved } from '../src/locked-world-acceptance.ts';
import { worldIds } from '../scene-src/navigation.js';
const ids=Object.keys(LOCKED_WORLD_REQUIREMENTS);
test('nine approved visual identities remain covered by all ten navigable portal routes',()=>{
  assert.equal(ids.length,9);
  assert.equal(worldIds.length,10);
  assert.ok(ids.every(id=>worldIds.includes(id)));
  assert.ok(worldIds.includes('diggitstaar'));
  assert.deepEqual(LOCKED_WORLD_REQUIREMENTS.relationships.variants,['realm','singles']);
  assert.ok(LOCKED_WORLD_REQUIREMENTS.style.anchors.includes('character-free interior'));
  assert.ok(LOCKED_WORLD_REQUIREMENTS.work.anchors.includes('no executive chair'));
});
test('preview geometry cannot pass founder visual signoff without evidence',()=>{
  const good=ids.map(id=>({id,approvedAssetId:id+'-signed',signedDesignEvidence:'review-'+id,actualDeviceCapture:'ios-'+id,visualReviewerApproved:true,navigationVerified:true,animationsVerified:true}));
  assert.equal(allNineWorldsApproved([]),false);
  assert.equal(allNineWorldsApproved(good.slice(0,8)),false);
  assert.equal(allNineWorldsApproved([...good.slice(0,8),good[0]]),false);
  assert.equal(allNineWorldsApproved(good),true);
  for(const key of ['approvedAssetId','signedDesignEvidence','actualDeviceCapture']){
    const bad={...good[0],[key]:''};assert.equal(isLockedWorldApproved(bad),false);
  }
  assert.equal(isLockedWorldApproved({...good[0],visualReviewerApproved:false}),false);
});
test('development environment is explicitly labeled preview, never approved master',()=>{
  const source=readFileSync(new URL('../app/environment.tsx',import.meta.url),'utf8');
  assert.match(source,/3D DEVELOPMENT PREVIEW/);
  assert.match(source,/Locked artwork, facial animation and final immersive set dressing are not yet approved/);
});

test('SH-331 return control reuses the existing Hub stack entry, with deep-link fallback', () => {
  const source = readFileSync(new URL('../app/environment.tsx', import.meta.url), 'utf8');
  assert.match(source, /returnToHub = \(\) => router\.dismissTo\('\/hub'\)/);
  assert.match(source, /button\('All worlds', returnToHub\)/);
  assert.match(source, /onPress=\{returnToHub\}/);
  assert.doesNotMatch(source, /router\.replace\('\/hub'\)/);
});
