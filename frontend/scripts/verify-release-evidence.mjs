/**
 * Build 187: independent provenance-file integrity checks for candidate release art.
 * A signed-off boolean in an asset receipt is not sufficient. Every model needs
 * independently stored source/visual/device/rights files with matching SHA-256.
 * This proves byte integrity only — not the truth of an author's assertions.
 */
import {readFile, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const ROLES=Object.freeze({
  guardian:['faceMultiAngle','armorCrest','deviceSpeechSync','rights'],
  world:['visualComparison','deviceCapture','animationNavigation','rights']
});
const isSha=x=>typeof x==='string' && /^[a-f0-9]{64}$/.test(x);
const safeName=x=>typeof x==='string' && /^[a-z0-9][a-z0-9_.-]{1,159}$/i.test(x) && !x.includes('..');
const bad=x=>{throw new Error('release_evidence_'+x);};
const sha=b=>createHash('sha256').update(b).digest('hex');

export async function verifyReleaseEvidence(root,guardian,worlds) {
  if(!guardian?.rigModelSha256 || !worlds || Object.keys(worlds).length!==10)bad('no_approved_art');
  const dir=path.resolve(root,'scene-src','assets','evidence');
  let ledger;
  try{ledger=JSON.parse(await readFile(path.join(dir,'acceptance-ledger.json'),'utf8'));}
  catch(e){bad('ledger_missing_or_invalid');}
  if(ledger?.schema!=='staar-production-evidence-ledger-v1' ||
     !Array.isArray(ledger?.assets) || ledger.assets.length!==11)bad('ledger_contract');
  const expected=new Map([['guardian-armored-rig',guardian.rigModelSha256],
    ...Object.entries(worlds).map(([key,item])=>[key,item.modelSha256])]);
  const actual=new Set();
  const evidenceHashes=[];
  for(const item of ledger.assets){
    const key=item?.assetKey;
    if(!expected.has(key)||actual.has(key))bad('unknown_or_duplicate_key');
    actual.add(key);
    if(item.modelSha256!==expected.get(key)||!isSha(item.modelSha256))bad('asset_hash_mismatch');
    if(!item.founderAcceptance || item.founderAcceptance.decision!=='accepted' ||
       !safeName(item.founderAcceptance.reviewerId) ||
       !Number.isFinite(Date.parse(item.founderAcceptance.signedAt)) ||
       !safeName(item.founderAcceptance.acceptanceId))bad('missing_founder_attestation');
    if(key==='guardian-armored-rig' &&
       item.sourceImageSha256!=='d7f18158a91778a7f3ce97c7326b1c75afefdc792c77ab02c4fead0e3ffa659c')
       bad('locked_identity_mismatch');
    const roles=key==='guardian-armored-rig'?ROLES.guardian:ROLES.world;
    if(!item.evidence || Object.keys(item.evidence).sort().join(',')!==roles.slice().sort().join(','))
       bad('missing_evidence_roles');
    for(const role of roles){
      const entry=item.evidence[role];
      if(!entry||!safeName(entry.filename)||!isSha(entry.sha256)||
         !safeName(entry.sourceRecordId))bad('evidence_descriptor_'+role);
      const location=path.join(dir,entry.filename);
      const info=await stat(location).catch(()=>null);
      if(!info?.isFile() || info.size<24 || info.size>150*1024*1024)bad('missing_evidence_file_'+role);
      const data=await readFile(location);
      if(sha(data)!==entry.sha256)bad('evidence_file_hash_'+role);
      evidenceHashes.push(entry.sha256);
    }
  }
  if(actual.size!==expected.size)bad('incomplete_asset_inventory');
  return {schema:'staar-production-evidence-integrity-v1',
    assetCount:actual.size,verifiableEvidenceFiles:evidenceHashes.length,
    ledgerSha256:sha(await readFile(path.join(dir,'acceptance-ledger.json'))),
    scope:'File existence, hashes and attestation fields only. No claim of human identity, visual fidelity, rights or device verification.'};
}
