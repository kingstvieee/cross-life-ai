import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {makePrivateB250QaIgnore,QA_PRIVATE_INCLUDE,
 preparePrivateB250QaArchive,inspectPrivateB250QaArchive} from '../scripts/prepare-private-b250-qa-archive.mjs';
import {generatePrivateEasIgnore} from '../scripts/prepare-private-eas-archive.mjs';
const rootIgnore='node_modules/\n*.zip\n';
const frontIgnore='scene-src/assets/private-guardian-qa/\nassets/audio/Starward_Guardian_Approved_AAC_iOS.m4a\n';
test('QA include rules unignore exact parent and private file and retain production AAC',()=>{
 const qa=makePrivateB250QaIgnore(rootIgnore,frontIgnore);
 const prod=generatePrivateEasIgnore(rootIgnore,frontIgnore);
 assert.ok(qa.startsWith(prod.trimEnd()));
 assert.ok(qa.includes('!frontend/scene-src/assets/private-guardian-qa/\n'));
 assert.ok(qa.includes('!'+QA_PRIVATE_INCLUDE+'\n'));
 assert.ok(prod.includes('!frontend/assets/audio/Starward_Guardian_Approved_AAC_iOS.m4a'));
 assert.equal(prod.includes('!'+QA_PRIVATE_INCLUDE),false);
});
test('Private archive preparation fails closed without real exact GLB and approved AAC',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'b252-archive-'));
 const front=path.join(root,'frontend');
 try{
  await mkdir(path.join(front,'scene-src'),{recursive:true});
  await writeFile(path.join(root,'.gitignore'),rootIgnore);
  await writeFile(path.join(front,'.gitignore'),frontIgnore);
  await assert.rejects(preparePrivateB250QaArchive({repoRoot:root,frontendRoot:front}));
  await assert.rejects(readFile(path.join(root,'.easignore'),'utf8'),/ENOENT/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('Uninspected checkout cannot masquerade as EAS preview archive',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'b252-inspect-'));
 try{
  await assert.rejects(inspectPrivateB250QaArchive({archiveRoot:root,checkoutRoot:root}),
   /private_b250_qa_archive_overlaps_checkout/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('QA workflow is manual and fails before billable build on any missing private asset',async()=>{
 const wf=await readFile(new URL('../.eas/workflows/iphone-qa-preview.yml',import.meta.url),'utf8');
 assert.match(wf,/workflow_dispatch:/);
 assert.match(wf,/node scripts\/prepare-private-b250-qa-archive.mjs prepare/);
 assert.match(wf,/node scripts\/stage-private-guardian-b250-qa.mjs/);
 assert.match(wf,/type: require-approval/);
 assert.doesNotMatch(wf,/eas submit|type: testflight/);
});
