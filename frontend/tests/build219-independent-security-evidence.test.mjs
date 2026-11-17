import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {signIndependentReadback,verifyIndependentSecurityEvidence}
 from '../scripts/verify-independent-security-evidence.mjs';

const KEY='K'.repeat(64),MODEL='a'.repeat(64);
async function fixture(){
 const dir=await mkdtemp(path.join(tmpdir(),'staar-sentinel-proof-'));
 const folder=path.join(dir,'scene-src','assets','evidence');
 await mkdir(folder,{recursive:true});
 return {dir,file:path.join(folder,'starcenttinel-live-readback.json')};
}
function record(now=Date.now()){
 const r={schema:'staarwardd-independent-security-readback-v1',
 service:'starcenttinel-security-control',issuedAt:new Date(now).toISOString(),
 nonce:'z'.repeat(48),mode:'ENFORCING',revision:1,
 externalAuthorityVerified:true,ownerWebauthnVerified:true,
 providerRevocationVerified:true,ninePortalEnforcementVerified:true,
 sourceProjectId:'khpprzhqovzhgxdltarq',guardianModelSha256:MODEL};
 r.proofHmacSha256=signIndependentReadback(r,KEY);
 return r;
}
test('Build 219 release uses exact verified Guardian hash and a fresh independent security proof',async()=>{
 const f=await fixture();try{
  const now=Date.now();
  await writeFile(f.file,JSON.stringify(record(now)));
  const result=await verifyIndependentSecurityEvidence(f.dir,{
   proofKey:KEY,now,expectedGuardianSha256:MODEL});
  assert.equal(result.verified,true);
  assert.equal(result.mode,'ENFORCING');
  assert.equal(result.sourceSha256,MODEL);
  await assert.rejects(verifyIndependentSecurityEvidence(f.dir,{
   proofKey:KEY,now,expectedGuardianSha256:'b'.repeat(64)}),/unverified_authority_or_release_source/);
  await assert.rejects(verifyIndependentSecurityEvidence(f.dir,{
   proofKey:'A'.repeat(64),now,expectedGuardianSha256:MODEL}),/invalid_signature/);
 }finally{await rm(f.dir,{recursive:true,force:true});}
});
test('Build 219 does not accept stale, unsigned, lockdown or forged recovery results',async()=>{
 const f=await fixture();try{
  const now=Date.now();
  for(const change of [
   r=>{r.issuedAt=new Date(now-700000).toISOString();},
   r=>{r.mode='LOCKDOWN';},
   r=>{r.ownerWebauthnVerified=false;},
   r=>{r.proofHmacSha256='a'.repeat(64);},
   r=>{r.providerRevocationVerified=false;}
  ]){
   const r=record(now);change(r);await writeFile(f.file,JSON.stringify(r));
   await assert.rejects(verifyIndependentSecurityEvidence(f.dir,{
    proofKey:KEY,now,expectedGuardianSha256:MODEL}),/starcenttinel_release_/);
  }
 }finally{await rm(f.dir,{recursive:true,force:true});}
});
test('Build 219 preflight requires StarCenttinel proof instead of a boolean-only review receipt',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../scripts/verify-production-package.mjs',import.meta.url),'utf8');
 assert.match(source,/verifyIndependentSecurityEvidence\(root/);
 assert.match(source,/starcenttinel-independent-security/);
});
