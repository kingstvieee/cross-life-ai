import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {stageApprovedStartupAudio, generatedNativeSource, verifyStagedNativeSource,
  AUDIO_RELATIVE,PRIVATE_SOURCE_RELATIVE} from '../scripts/stage-approved-startup-audio.mjs';

const current=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fakeBytes=()=>{
 const data=Buffer.alloc(512,0);
 data.writeUInt32BE(24,0);data.write('ftyp',4);data.write('M4A ',8);
 return data;
};
const fixture=async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'staar-aac-'));
 const bytes=fakeBytes();
 const source=path.join(root,'source-approved.m4a');
 await writeFile(source,bytes);
 const expected={filename:'Starward_Guardian_Approved_AAC_iOS.m4a',
  bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
 return {root,bytes,source,expected};
};

test('private staging verifies actual bytes and generates a Metro-bundled native alias, not a public asset',async()=>{
 const f=await fixture();
 try{
  const result=await stageApprovedStartupAudio({inputFile:f.source,frontendRoot:f.root,expected:f.expected});
  assert.equal(result.sha256,f.expected.sha256);
  assert.deepEqual(await readFile(path.join(f.root,AUDIO_RELATIVE)),f.bytes);
  assert.equal((await readFile(path.join(f.root,PRIVATE_SOURCE_RELATIVE),'utf8')),generatedNativeSource(f.expected));
  assert.equal((await verifyStagedNativeSource(f.root,f.expected)).verified,true);
  assert.match(generatedNativeSource(f.expected),/require\("@\/assets\/audio\/Starward_Guardian_Approved_AAC_iOS\.m4a"\)/);
 }finally{await rm(f.root,{recursive:true,force:true});}
});

test('missing, altered or invalid approved AAC never overwrites successfully staged media',async()=>{
 const f=await fixture();
 try{
  await assert.rejects(stageApprovedStartupAudio({frontendRoot:f.root,expected:f.expected}),/approved_audio_input_required/);
  await stageApprovedStartupAudio({inputFile:f.source,frontendRoot:f.root,expected:f.expected});
  const altered=Buffer.from(f.bytes);altered[35]=8;
  await writeFile(f.source,altered);
  await assert.rejects(stageApprovedStartupAudio({inputFile:f.source,frontendRoot:f.root,expected:f.expected}),/approved_audio_hash_mismatch/);
  assert.deepEqual(await readFile(path.join(f.root,AUDIO_RELATIVE)),f.bytes);
  const moduleContent=await readFile(path.join(f.root,PRIVATE_SOURCE_RELATIVE),'utf8');
  assert.equal(moduleContent,generatedNativeSource(f.expected));
 }finally{await rm(f.root,{recursive:true,force:true});}
});

test('signed bundle rejects a missing or tampered source alias even when AAC exists',async()=>{
 const f=await fixture();
 try{
  await assert.rejects(verifyStagedNativeSource(f.root,f.expected));
  await mkdir(path.dirname(path.join(f.root,PRIVATE_SOURCE_RELATIVE)),{recursive:true});
  await writeFile(path.join(f.root,PRIVATE_SOURCE_RELATIVE),'export default null;\n');
  await assert.rejects(verifyStagedNativeSource(f.root,f.expected),/approved_audio_bundle_module_mismatch/);
 }finally{await rm(f.root,{recursive:true,force:true});}
});

test('the public source is only a null fallback and cannot silently ship approved music',async()=>{
 const source=await readFile(path.join(current,'components/staarwardd/startup-approved-soundtrack-source.ts'),'utf8');
 const native=await readFile(path.join(current,'components/staarwardd/startup-film-player.tsx'),'utf8');
 const ig=await readFile(path.join(current,'.gitignore'),'utf8');
 assert.match(source,/approvedStartupSoundtrackSource: AudioSource \| null = null/);
 assert.match(native,/useAudioPlayer\(approvedStartupSoundtrackSource\)/);
 assert.match(native,/p\.muted = approvedMusicAvailable \|\| muted/);
 assert.match(native,/player\.muted = gate\.muteFilm/);
 assert.match(native,/soundtrack\.muted = gate\.muteMusic/);
 assert.match(native,/useAudioPlayerStatus\(soundtrack\)/);
 assert.match(ig,/assets\/audio\/Starward_Guardian_Approved_AAC_iOS\.m4a/);
 assert.match(ig,/startup-approved-soundtrack-source\.native\.ts/);
});
