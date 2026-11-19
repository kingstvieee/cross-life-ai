import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=name=>readFile(new URL(name,root),'utf8');
test('all nine official portals use their distinct locked artwork',async()=>{
 const source=await read('lib/staarwardd/portal-data.ts');
 const mapping={creativity:'creativity',work:'work',home:'home',wellbeing:'wellbeing',relationships:'love',events:'events',style:'style',staarsonic:'staarsonic',staarverse:'staarverse'};
 for(const [id,asset] of Object.entries(mapping)){
  assert.ok(source.includes('locked/'+asset+'.png'),id+' does not use locked artwork');
  const file=new URL('assets/images/staarwardd/locked/'+asset+'.png',root);
  assert.ok((await stat(file)).size>10000,id+' missing locked image');
 }
 assert.equal(new Set(Object.values(mapping)).size,9);
});
test('homepage has approved central master and independently accessible tenth Singles Lounge',async()=>{
 const source=await read('components/staarwardd/world-hub.tsx');
 assert.match(source,/locked\/homepage\.png/);
 assert.match(source,/locked\/love-singles\.png/);
 assert.match(source,/accessibilityLabel="Explore STAAR Love Singles Lounge"/);
 assert.match(source,/world: 'relationships', variant: 'singles'/);
 assert.ok((await stat(new URL('assets/images/staarwardd/locked/love-singles.png',root))).size>10000);
 const environment=await read('app/environment.tsx');
 assert.match(environment,/world === 'relationships' && rawVariant === 'singles'/);
 assert.match(environment,/variant=\{variant\}/);
 const keys=await read('src/iphone-qa-archive.ts');
 assert.match(keys,/'relationships-realm','relationships-singles'/);
});
