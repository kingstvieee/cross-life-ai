/** Read-only integrity check of quarantined GLBs. Never grants release approval. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=process.env.STAAR_PRIVATE_REVIEW_DIR;
if(!root)throw Error('STAAR_PRIVATE_REVIEW_DIR must name the private REVIEW_ONLY folder');
const audit=JSON.parse(await readFile(path.join(root,'STAAR_RELEASE_EVIDENCE_GAP_AUDIT.json'),'utf8'));
if(audit.releaseApproved!==false||audit.guardianAndWorlds?.length!==11)throw Error('Unexpected audit manifest or approval state');
const results=[];
for(const item of audit.guardianAndWorlds){
 const filename=item.asset.startsWith('Guardian_')?item.asset+'.glb':path.join('worlds',item.asset+'.glb');
 const bytes=await readFile(path.join(root,filename));
 const sha=createHash('sha256').update(bytes).digest('hex');
 const integrity=sha===item.sha256&&bytes.length===item.bytes&&bytes.toString('ascii',0,4)==='glTF';
 results.push({asset:item.asset,sha256:sha,bytes:bytes.length,integrity,status:item.status,missing:item.missing});
}
const report={schema:'staar-review-only-release-candidate-integrity-v1',integrityPassed:results.every(x=>x.integrity),releaseApproved:false,assetsChecked:results.length,releaseReceiptsCreated:0,deviceAttestationsCreated:0,results};
console.log(JSON.stringify(report,null,2));
if(!report.integrityPassed)process.exitCode=1;
