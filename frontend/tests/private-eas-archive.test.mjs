import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,cp,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {stageApprovedStartupAudio, AUDIO_RELATIVE,PRIVATE_SOURCE_RELATIVE} from '../scripts/stage-approved-startup-audio.mjs';
import {preparePrivateEasArchive,inspectPrivateEasArchive,generatePrivateEasIgnore,verifyPrivateEasUploadRules,EAS_INCLUDE_PATHS} from '../scripts/prepare-private-eas-archive.mjs';

async function fixture(){
 const root=await mkdtemp(path.join(tmpdir(),'staar-eas-private-'));
 const frontend=path.join(root,'frontend');
 await mkdir(frontend,{recursive:true});
 await writeFile(path.join(root,'.gitignore'),'*.zip\nnode_modules/\n/frontend/ios/\n');
 await writeFile(path.join(frontend,'.gitignore'),'node_modules/\nassets/audio/Starward_Guardian_Approved_AAC_iOS.m4a\ncomponents/staarwardd/startup-approved-soundtrack-source.native.ts\n');
 const bytes=Buffer.alloc(512,0);
 bytes.writeUInt32BE(24,0);bytes.write('ftyp',4);bytes.write('M4A ',8);
 const expected={filename:'Starward_Guardian_Approved_AAC_iOS.m4a',bytes:bytes.length,
 sha256:createHash('sha256').update(bytes).digest('hex')};
 const source=path.join(root,'private-song.m4a');
 await writeFile(source,bytes);
 return {root,frontend,bytes,expected,source};
}
test('local private upload includes exactly two named song assets and preserves base ignores',async()=>{
 const f=await fixture();
 try{
  await stageApprovedStartupAudio({inputFile:f.source,frontendRoot:f.frontend,expected:f.expected});
  const result=await preparePrivateEasArchive({repoRoot:f.root,frontendRoot:f.frontend,expected:f.expected});
  const ignore=await readFile(path.join(f.root,'.easignore'),'utf8');
  assert.equal(result.readyForArchiveInspection,true);
  assert.ok(ignore.includes('*.zip'));
  assert.ok(ignore.includes('frontend/node_modules/'));
  assert.ok(EAS_INCLUDE_PATHS.every(n=>ignore.includes('!'+n)));
  assert.ok(ignore.trimEnd().endsWith('!'+EAS_INCLUDE_PATHS.at(-1)));
  assert.ok(result.soundtrackSha256===f.expected.sha256);
  await preparePrivateEasArchive({repoRoot:f.root,frontendRoot:f.frontend,expected:f.expected});
 }finally{await rm(f.root,{recursive:true,force:true});}
});
test('no uploaded archive allowed without actual approved soundtrack',async()=>{
 const f=await fixture();
 try{
  await assert.rejects(preparePrivateEasArchive({repoRoot:f.root,frontendRoot:f.frontend,expected:f.expected}));
  await assert.rejects(readFile(path.join(f.root,'.easignore'),'utf8'),/ENOENT/);
 }finally{await rm(f.root,{recursive:true,force:true});}
});
test('existing foreign .easignore will not be overwritten',async()=>{
 const f=await fixture();
 try{
  await stageApprovedStartupAudio({inputFile:f.source,frontendRoot:f.frontend,expected:f.expected});
  await writeFile(path.join(f.root,'.easignore'),'!sensitive-unrelated-file.txt\n');
  await assert.rejects(preparePrivateEasArchive({repoRoot:f.root,frontendRoot:f.frontend,expected:f.expected}),/existing_easignore_not_overwritten/);
  assert.equal(await readFile(path.join(f.root,'.easignore'),'utf8'),'!sensitive-unrelated-file.txt\n');
 }finally{await rm(f.root,{recursive:true,force:true});}
});
test('EAS archive is verified by actual file bytes and exact native alias, not inclusion rules alone',async()=>{
 const f=await fixture();
 try{
  await stageApprovedStartupAudio({inputFile:f.source,frontendRoot:f.frontend,expected:f.expected});
  const passed=await inspectPrivateEasArchive({archiveRoot:f.root,expected:f.expected});
  assert.equal(passed.archiveVerified,true);
  assert.equal(passed.bytes,f.expected.bytes);
  const audioFile=path.join(f.frontend,AUDIO_RELATIVE);
  const bad=Buffer.from(f.bytes);bad[120]=42;await writeFile(audioFile,bad);
  await assert.rejects(inspectPrivateEasArchive({archiveRoot:f.root,expected:f.expected}),/private_audio_absent_or_altered/);
 }finally{await rm(f.root,{recursive:true,force:true});}
});
test('frontend-specific ignore rules are rooted at the monorepo Git root, negations last',()=>{
 const content=generatePrivateEasIgnore('dist/\n.env\n','/node_modules/\nfrontend-any/\n*.pem\n');
 assert.match(content,/frontend\/node_modules\//);
 assert.match(content,/frontend\/frontend-any\//);
 assert.match(content,/frontend\/\*\.pem/);
 assert.ok(content.trimEnd().endsWith('!'+EAS_INCLUDE_PATHS.at(-1)));
});


test('Build 211 signed preflight refuses missing or tampered local EAS upload policy',async()=>{
 const f=await fixture();
 try{
  await assert.rejects(verifyPrivateEasUploadRules({repoRoot:f.root,frontendRoot:f.frontend}),/ENOENT/);
  await stageApprovedStartupAudio({inputFile:f.source,frontendRoot:f.frontend,expected:f.expected});
  await preparePrivateEasArchive({repoRoot:f.root,frontendRoot:f.frontend,expected:f.expected});
  const verified=await verifyPrivateEasUploadRules({repoRoot:f.root,frontendRoot:f.frontend});
  assert.equal(verified.verifiedLocalUploadRules,true);
  assert.equal(verified.includePaths.length,2);
  const ignore=await readFile(path.join(f.root,'.easignore'),'utf8');
  await writeFile(path.join(f.root,'.easignore'),ignore+'!frontend/secrets.txt\\n');
  await assert.rejects(verifyPrivateEasUploadRules({repoRoot:f.root,frontendRoot:f.frontend}),/private_eas_ignore_missing_or_noncanonical/);
 }finally{await rm(f.root,{recursive:true,force:true});}
});

test('Build 221 release preflight rejects a checkout masquerading as an Expo inspected archive',async()=>{
 const f=await fixture();
 const independent=await mkdtemp(path.join(tmpdir(),'staar-real-independent-inspect-'));
 try {
   await stageApprovedStartupAudio({inputFile:f.source,frontendRoot:f.frontend,expected:f.expected});
   await assert.rejects(inspectPrivateEasArchive({
     archiveRoot:f.root,checkoutRoot:f.frontend,expected:f.expected,
   }),/private_archive_overlaps_checkout/);
   await assert.rejects(inspectPrivateEasArchive({
     archiveRoot:f.frontend,checkoutRoot:f.frontend,expected:f.expected,
   }),/private_archive_overlaps_checkout/);
   await cp(f.frontend,path.join(independent,'frontend'),{recursive:true});
   const pass=await inspectPrivateEasArchive({
     archiveRoot:independent,checkoutRoot:f.frontend,expected:f.expected,
   });
   assert.equal(pass.archiveVerified,true);
   // The file content is accepted only in a physically separate extraction.
   const alias=path.join(f.root,'faux-eas-inspection');
   await symlink(f.frontend,alias,'dir');
   await assert.rejects(inspectPrivateEasArchive({
     archiveRoot:alias,checkoutRoot:f.frontend,expected:f.expected,
   }),/private_archive_overlaps_checkout/);
 }finally{
   await rm(f.root,{recursive:true,force:true});
   await rm(independent,{recursive:true,force:true});
 }
});
