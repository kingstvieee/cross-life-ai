import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { allNineWorldsApproved } from '../src/locked-world-acceptance.ts';
import { mayAnimateApprovedGuardianFace } from '../src/guardian-visemes.ts';

test('founder-locked startup film is byte-for-byte unchanged',()=>{
 const path=new URL('../assets/videos/guardian-startup.mp4',import.meta.url);
 const bytes=readFileSync(path);
 assert.equal(statSync(path).size,18775244);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'1c8dce7f7b5f18e9ae580ec14910a0e20939cb8b52ec43897a08d2ecaa98886c');
});
test('release cannot claim final artwork or Guardian facial rig without approved proof',()=>{
 assert.equal(allNineWorldsApproved([]),false);
 assert.equal(mayAnimateApprovedGuardianFace(null,'a'.repeat(64)),false);
});
test('native TestFlight is not claimed by web export or Expo prebuild',()=>{
 const text=readFileSync(new URL('../../docs/BUILD_139_INTEGRATION_EVIDENCE.md',import.meta.url),'utf8');
 assert.match(text,/NOT FINAL/);
 assert.match(text,/signed IPA/);
});

test('Guardian live avatar never imports rejected geometry or swaps the founder-approved identity',()=>{
 const avatar=readFileSync(new URL('../components/staarwardd/guardian-character.tsx',import.meta.url),'utf8');
 const startupNative=readFileSync(new URL('../components/staarwardd/startup-film-player.tsx',import.meta.url),'utf8');
 const startupWeb=readFileSync(new URL('../components/staarwardd/startup-film-player.web.tsx',import.meta.url),'utf8');
 for(const src of [avatar,startupNative,startupWeb]){
   assert.doesNotMatch(src,/REJECTED_identity_mismatch|REJECTED_user_declined_appearance/);
 }
 assert.match(startupNative,/guardian-startup\.mp4/);
 assert.match(startupWeb,/guardian-startup\.mp4/);
 assert.match(avatar,/guardian-poses\/guide\.png/);
});
