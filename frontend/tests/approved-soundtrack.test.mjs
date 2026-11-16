import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {verifyApprovedSoundtrack,LOCKED_GUARDIAN_MUSIC} from '../scripts/verify-approved-soundtrack.mjs';
const fixture=async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'staar-approved-aac-'));
 await mkdir(path.join(root,'assets/audio'),{recursive:true});
 const bytes=Buffer.alloc(512,0);
 bytes.writeUInt32BE(24,0); bytes.write('ftyp',4);bytes.write('M4A ',8);
 const exp={...LOCKED_GUARDIAN_MUSIC,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
 return {root,bytes,exp,file:path.join(root,'assets/audio',exp.filename)};
};
test('exact staged AAC fingerprint is required; recorded original Opus master remains separate',async()=>{
 const {root,bytes,exp,file}=await fixture();
 try {
  assert.notEqual(LOCKED_GUARDIAN_MUSIC.sha256,LOCKED_GUARDIAN_MUSIC.sourceSha256);
  assert.equal(LOCKED_GUARDIAN_MUSIC.codec,'aac');
  assert.equal(LOCKED_GUARDIAN_MUSIC.bytes,6743732);
  await writeFile(file,bytes);
  const got=await verifyApprovedSoundtrack(root,exp);
  assert.equal(got.sha256,exp.sha256);
  assert.match(got.caveat,/independently on device/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('missing, altered or incorrect container fails closed',async()=>{
 const {root,bytes,exp,file}=await fixture();
 try {
  await assert.rejects(verifyApprovedSoundtrack(root,exp));
  await writeFile(file,Buffer.from('incorrect'));
  await assert.rejects(verifyApprovedSoundtrack(root,exp),/approved_audio_size_mismatch/);
  bytes[4]=0;await writeFile(file,bytes);
  await assert.rejects(verifyApprovedSoundtrack(root,{...exp,sha256:createHash('sha256').update(bytes).digest('hex')}),/invalid_mp4_container/);
  bytes.write('ftyp',4);bytes[50]=2;await writeFile(file,bytes);
  await assert.rejects(verifyApprovedSoundtrack(root,exp),/approved_audio_hash_mismatch/);
 }finally{await rm(root,{recursive:true,force:true});}
});