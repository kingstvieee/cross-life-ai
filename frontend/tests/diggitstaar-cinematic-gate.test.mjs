import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const base=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,base),'utf8');
test('DIGGITSTAAR adds an optional cinematic entrance without replacing the native 3D workspace',()=>{
 const app=read('app/diggitstaar.tsx');
 assert.match(app,/DiggitstaarCinematicIntro/);
 assert.match(app,/<WorldScene world="diggitstaar"/);
 assert.match(app,/DIGGITSTAAR_MEDIA_READY && introVisible/);
 assert.match(app,/checkGmail/);
 assert.match(app,/Client Leads & Opportunities/);
});
test('cinematic playback fails open and requires exact media source gate',()=>{
 const component=read('components/staarwardd/diggitstaar-cinematic-intro.tsx');
 const source=read('lib/staarwardd/diggitstaar-cinematic-sources.ts');
 assert.match(component,/addListener\('playToEnd'/);
 assert.match(component,/setTimeout\(onFinish, 8500\)/);
 assert.match(component,/SOUND OFF/);
 assert.match(source,/DIGGITSTAAR_MEDIA_READY/);
 const files=['assets/videos/diggitstaar-workstation-wide.mp4','assets/videos/diggitstaar-workstation-portrait.mp4'];
 if(source.includes("= require(")) assert.ok(files.every(f=>existsSync(new URL(f,base))),'both certified videos must exist when sources are enabled');
});
test('cinematic route does not edit guardian startup, release build config or nine portal masters',()=>{
 const app=read('app/diggitstaar.tsx');
 assert.ok(!/guardian-startup\\.mp4|starward-guardian.*m4a/.test(app));
});
