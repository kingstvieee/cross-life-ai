/** Build 219 — private, current StarCenttinel independent-readback evidence.
 * Fail-closed release gate. The current live control plane is LOCKDOWN and
 * cannot generate an accepted attestation. No fake approvals are bundled.
 */
import {readFile} from 'node:fs/promises';
import {createHmac,timingSafeEqual} from 'node:crypto';
import path from 'node:path';

const isSha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const fail=x=>{throw new Error('starcenttinel_release_'+x);};
export const SENTINEL_RELEASE_FIELDS=Object.freeze([
 'schema','service','issuedAt','nonce','mode','revision',
 'externalAuthorityVerified','ownerWebauthnVerified',
 'providerRevocationVerified','ninePortalEnforcementVerified',
 'sourceProjectId','appSourceCommitSha256'
]);

export function signIndependentReadback(fields,key) {
 if(typeof key!=='string'||key.length<32)fail('key_missing');
 const canonical=JSON.stringify(Object.fromEntries(SENTINEL_RELEASE_FIELDS.map(k=>[k,fields?.[k]])));
 return createHmac('sha256',key).update('staarwardd-starcenttinel-release-v1\n'+canonical).digest('hex');
}
export async function verifyIndependentSecurityEvidence(root,{
 proofKey=process.env.STARCENTTINEL_RELEASE_PROOF_KEY,
 now=Date.now(),
 expectedSourceSha256,
}={}) {
 const file=path.resolve(root,'scene-src','assets','evidence','starcenttinel-live-readback.json');
 let evidence;
 try{evidence=JSON.parse(await readFile(file,'utf8'));}
 catch{fail('private_readback_missing');}
 if(evidence?.schema!=='staarwardd-independent-security-readback-v1' ||
    evidence?.service!=='starcenttinel-security-control' ||
    evidence?.mode!=='ENFORCING' ||
    evidence?.externalAuthorityVerified!==true ||
    evidence?.ownerWebauthnVerified!==true ||
    evidence?.providerRevocationVerified!==true ||
    evidence?.ninePortalEnforcementVerified!==true ||
    evidence?.sourceProjectId!=='khpprzhqovzhgxdltarq' ||
    !Number.isInteger(evidence?.revision)||evidence.revision<1 ||
    !isSha(evidence.appSourceCommitSha256) ||
    !isSha(expectedSourceSha256) ||
    evidence.appSourceCommitSha256!==expectedSourceSha256)
    fail('unverified_authority_or_release_source');
 const issued=Date.parse(evidence.issuedAt);
 if(!Number.isFinite(issued)||!Number.isFinite(now)||
    issued>now+30000||now-issued>10*60*1000)fail('stale_readback');
 if(typeof evidence.nonce!=='string'||!/^[-_A-Za-z0-9]{32,128}$/.test(evidence.nonce))
    fail('bad_nonce');
 const signature=evidence.proofHmacSha256;
 if(!isSha(signature))fail('unsigned_evidence');
 const expected=signIndependentReadback(evidence,proofKey);
 if(!timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(expected,'hex')))
    fail('invalid_signature');
 return {verified:true,mode:evidence.mode,revision:evidence.revision,
  sourceProjectId:evidence.sourceProjectId,sourceSha256:evidence.appSourceCommitSha256,
  caveat:'Valid private proof file; external live action/physical device testing remains separate.'};
}
