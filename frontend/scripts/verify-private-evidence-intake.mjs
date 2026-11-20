/** Fail-closed verification of private release-evidence intake, without fabricating receipts. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=process.env.STAAR_PRIVATE_REVIEW_DIR;
if(!root)throw Error('STAAR_PRIVATE_REVIEW_DIR is required');
const load=async name=>JSON.parse(await readFile(path.join(root,name),'utf8'));
const intake=await load('STAAR_INDEPENDENT_EVIDENCE_INTAKE.json');
const inventory=await load('STAAR_CANDIDATE_INTEGRITY_LATEST.json');
const audit=await load('STAAR_RELEASE_EVIDENCE_GAP_AUDIT.json');
const problems=[];
if(intake.schema!=='staar-independent-evidence-intake-v1'||intake.releaseApproved!==false||intake.assetCount!==11||intake.assets?.length!==11)problems.push('intake_contract');
if(inventory.integrityPassed!==true||inventory.releaseApproved!==false||inventory.assetsChecked!==11)problems.push('integrity_contract');
const originals=new Map(audit.guardianAndWorlds.map(x=>[x.asset,x]));
for(const entry of intake.assets??[]){
 const original=originals.get(entry.asset);
 if(!original||entry.sha256!==original.sha256)problems.push('asset_hash_'+entry.asset);
 const candidate=inventory.results?.find(x=>x.asset===entry.asset);
 if(!candidate||candidate.sha256!==entry.sha256||candidate.integrity!==true)problems.push('candidate_mismatch_'+entry.asset);
 const roles=entry.asset.startsWith('Guardian_')?['faceMultiAngle','armorCrest','deviceSpeechSync','rights']:['visualComparison','deviceCapture','animationNavigation','rights'];
 if(Object.keys(entry.requiredEvidence??{}).sort().join(',')!==roles.sort().join(','))problems.push('roles_'+entry.asset);
}
const status={schema:'staar-release-evidence-intake-verification-v1',intakeConsistent:problems.length===0,verifiedModelCount:inventory.results?.filter(x=>x.integrity).length??0,independentEvidenceRecordsVerified:0,deviceCertification:false,rightsCertification:false,releaseAuthorized:false,problems};
console.log(JSON.stringify(status,null,2));
if(problems.length)process.exitCode=1;
