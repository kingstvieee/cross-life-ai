import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,rm,mkdtemp,readFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {
 B250_PRIVATE_IPHONE_QA_SHA256,B250_PRIVATE_IPHONE_QA_BYTES,
 B250_PRIVATE_RELATIVE_PATH,isInternalGuardianQaBuild,
 inspectInternalGuardianQaBytes,loadInternalGuardianQaAsset
} from '../scene-src/internal-guardian-qa.mjs';
import {verifyPrivateGuardianPreview} from '../scripts/stage-private-guardian-b250-qa.mjs';
const env={EAS_BUILD_PROFILE:'preview',STAAR_IPHONE_ONLY_QA:'1',
 EXPO_PUBLIC_GUARDIAN_DEVICE_QA:'1',EXPO_PUBLIC_WORLD_COLLISION_QA:'1'};
test('Exact, distinct private B250 binary digest and file path are fixed',()=>{
 assert.equal(B250_PRIVATE_IPHONE_QA_SHA256,'057099cac71e04d6e1282b23fb52c9d593b8c1a4e055309254ca1f5609a42134');
 assert.equal(B250_PRIVATE_IPHONE_QA_BYTES,12646332);
 assert.equal(B250_PRIVATE_RELATIVE_PATH,'assets/private-guardian-qa/guardian-b250-iphone-qa.glb');
});
test('Private B250 is only enabled under every internal physical iPhone preview condition',()=>{
 assert.equal(isInternalGuardianQaBuild(env),true);
 for(const key of Object.keys(env)){
  assert.equal(isInternalGuardianQaBuild({...env,[key]:'0'}),false,key);
 }
 assert.equal(isInternalGuardianQaBuild({...env,EAS_BUILD_PROFILE:'production'}),false);
 assert.equal(isInternalGuardianQaBuild({...env,EAS_BUILD_PROFILE:undefined}),false);
});
test('Missing QA rig refuses the preview source before a costly EAS build',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'staar-b252-'));
 try{
  await assert.rejects(loadInternalGuardianQaAsset(root,{env}),/guardian_internal_qa_exact_private_glb_missing/);
  await assert.rejects(verifyPrivateGuardianPreview({root:path.dirname(root)}),/guardian_internal_qa_exact_private_glb_missing|ENOENT/);
  assert.equal(await loadInternalGuardianQaAsset(root,{env:{}}),null);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('Tampered, fake or compressed binary never loads as a Guardian',()=>{
 assert.throws(()=>inspectInternalGuardianQaBytes(Buffer.alloc(16)),/guardian_internal_qa_incorrect_byte_length/);
 const fake=Buffer.alloc(B250_PRIVATE_IPHONE_QA_BYTES);
 assert.throws(()=>inspectInternalGuardianQaBytes(fake),/guardian_internal_qa_invalid_glb_header/);
});
test('Production build fails if someone accidentally stages private B250 model in project',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'staar-b252-prod-'));
 try{
  const candidate=path.join(root,B250_PRIVATE_RELATIVE_PATH);
  await mkdir(path.dirname(candidate),{recursive:true});
  await writeFile(candidate,Buffer.from('private-do-not-publish'));
  await assert.rejects(loadInternalGuardianQaAsset(root,{env:{EAS_BUILD_PROFILE:'production'}}),
   /guardian_internal_qa_private_file_in_production/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('Scene build routes QA binary only through dedicated preview mode, not approved production loader',async()=>{
 const script=await readFile(new URL('../scene-src/build.mjs',import.meta.url),'utf8');
 const runtime=await readFile(new URL('../scene-src/worlds.js',import.meta.url),'utf8');
 const workflow=await readFile(new URL('../.eas/workflows/iphone-qa-preview.yml',import.meta.url),'utf8');
 const ignored=await readFile(new URL('../.gitignore',import.meta.url),'utf8');
 assert.match(script,/loadInternalGuardianQaAsset/);
 assert.match(script,/STAAR_PRIVATE_GUARDIAN_QA_MODEL/);
 assert.match(runtime,/window\.STAAR_GUARDIAN_QA===true/);
 assert.match(runtime,/internal\?\?window\.STAAR_APPROVED_GUARDIAN_MODEL/);
 assert.match(runtime,/REVIEW ONLY · NOT A RELEASED 3D GUARDIAN/);
 assert.match(workflow,/node scripts\/stage-private-guardian-b250-qa.mjs/);
 assert.match(ignored,/scene-src\/assets\/private-guardian-qa\//);
});
