import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,unlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {verifyReleaseEvidence} from '../scripts/verify-release-evidence.mjs';
import {REQUIRED_WORLD_ASSETS} from '../scene-src/approved-world-assets.mjs';

const digest=b=>createHash('sha256').update(b).digest('hex');
const guardianSha='a'.repeat(64);
const worlds=Object.fromEntries(REQUIRED_WORLD_ASSETS.map((key,i)=>[
  key,{modelSha256:digest(Buffer.from('synthetic-model-'+i))}]));
const token='d7f18158a91778a7f3ce97c7326b1c75afefdc792c77ab02c4fead0e3ffa659c';

async function fixture(){
 const root=await mkdtemp(path.join(tmpdir(),'staar-evidence-'));
 const folder=path.join(root,'scene-src/assets/evidence');
 await mkdir(folder,{recursive:true});
 const records=[], files=[];
 for(const [key,sha] of [['guardian-armored-rig',guardianSha],...Object.entries(worlds).map(([k,v])=>[k,v.modelSha256])]){
  const roles=key==='guardian-armored-rig'?
   ['faceMultiAngle','armorCrest','deviceSpeechSync','rights']:
   ['visualComparison','deviceCapture','animationNavigation','rights'];
  const evidence={};
  for(const role of roles){
   const filename=key+'_'+role+'.txt';
   const bytes=Buffer.from('UNIT TEST ONLY, NOT AN ACTUAL OWNER OR DEVICE RECORD: '+key+' '+role);
   await writeFile(path.join(folder,filename),bytes);
   files.push(path.join(folder,filename));
   evidence[role]={filename,sha256:digest(bytes),sourceRecordId:'fixture-test'};
  }
  records.push({assetKey:key,modelSha256:sha,
   ...(key==='guardian-armored-rig'?{sourceImageSha256:token}:{}),
   founderAcceptance:{decision:'accepted',reviewerId:'test-only',acceptanceId:'test-only',signedAt:'2026-11-16T00:00:00.000Z'},
   evidence});
 }
 const ledger={schema:'staar-production-evidence-ledger-v1',assets:records};
 const ledgerPath=path.join(folder,'acceptance-ledger.json');
 await writeFile(ledgerPath,JSON.stringify(ledger));
 return {root,folder,files,ledgerPath,ledger};
}

test('separate hash-pinned proof is required for 11 assets; fixture is never production evidence',async()=>{
 const f=await fixture();
 try{
  const info=await verifyReleaseEvidence(f.root,{rigModelSha256:guardianSha},worlds);
  assert.equal(info.assetCount,11);assert.equal(info.verifiableEvidenceFiles,44);
  assert.match(info.scope,/No claim of human identity/);
 }finally{await rm(f.root,{recursive:true,force:true});}
});

test('missing physical evidence file blocks release even with true JSON acceptance flags',async()=>{
 const f=await fixture();
 try{
  await unlink(f.files[1]);
  await assert.rejects(verifyReleaseEvidence(f.root,{rigModelSha256:guardianSha},worlds),/release_evidence_missing_evidence_file/);
 }finally{await rm(f.root,{recursive:true,force:true});}
});

test('tampered evidence and forged model digest are rejected',async()=>{
 const f=await fixture();
 try{
  await writeFile(f.files[0],Buffer.from('altered evidence data that cannot match the original secure hash'));
  await assert.rejects(verifyReleaseEvidence(f.root,{rigModelSha256:guardianSha},worlds),/release_evidence_evidence_file_hash/);
  f.ledger.assets[0].modelSha256='b'.repeat(64);
  await writeFile(f.ledgerPath,JSON.stringify(f.ledger));
  await assert.rejects(verifyReleaseEvidence(f.root,{rigModelSha256:guardianSha},worlds),/release_evidence_asset_hash_mismatch/);
 }finally{await rm(f.root,{recursive:true,force:true});}
});

test('path traversal and non-acceptance fail closed',async()=>{
 const f=await fixture();
 try{
  f.ledger.assets[0].evidence.rights.filename='../outside.txt';
  await writeFile(f.ledgerPath,JSON.stringify(f.ledger));
  await assert.rejects(verifyReleaseEvidence(f.root,{rigModelSha256:guardianSha},worlds),/release_evidence_evidence_descriptor/);
  f.ledger.assets[0].evidence.rights.filename='guardian-armored-rig_rights.txt';
  f.ledger.assets[0].founderAcceptance.decision='pending';
  await writeFile(f.ledgerPath,JSON.stringify(f.ledger));
  await assert.rejects(verifyReleaseEvidence(f.root,{rigModelSha256:guardianSha},worlds),/release_evidence_missing_founder_attestation/);
 }finally{await rm(f.root,{recursive:true,force:true});}
});