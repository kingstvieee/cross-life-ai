/** Local creator declaration, not third-party rights clearance or device certification. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash,generateKeyPairSync,sign,verify,createPublicKey} from 'node:crypto';
import path from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex');
const stable=o=>JSON.stringify(o);
// Do not require local private bytes at module-import time. The public CI
// audit imports the verifier to report blockers, never to create evidence.
const requirePrivateRoot=()=>{
 const root=process.env.STAAR_PRIVATE_REVIEW_DIR;
 if(!root)throw Error('STAAR_PRIVATE_REVIEW_DIR required');
 return root;
};
const files=[['guardian-armored-rig','Guardian_Build228_Founder_Visual_Approved_Release_Pending.glb'],...['home-residence','work-command','creativity-dream','wellbeing-health','relationships-realm','relationships-singles','events-village','style-closet','staarverse-universe','staarsonic-studio'].map(n=>[n,`worlds/${n}.glb`])];
export async function verifyLocalCreatorManifest(){
 const root=requirePrivateRoot();
 const output=path.join(root,'LOCAL_CREATOR_PROVENANCE_MANIFEST.json');
 const d=JSON.parse(await readFile(output,'utf8'));
 if(d.payload.schema!=='staar-local-creator-provenance-v1'||d.payload.assets.length!==11)throw Error('manifest contract invalid');
 if(!verify(null,Buffer.from(stable(d.payload)),createPublicKey(d.signature.publicKeyPem),Buffer.from(d.signature.signatureBase64,'base64')))throw Error('signature invalid');
 for(const [id,relativePath] of files){const a=d.payload.assets.find(x=>x.id===id);if(!a||a.relativePath!==relativePath)throw Error('asset identity mismatch '+id);const b=await readFile(path.join(root,relativePath));if(a.sha256!==sha(b)||a.bytes!==b.length)throw Error('asset hash mismatch '+id);}
 return {manifestVerified:true,assetCount:11,localCreatorDeclaration:true,independentRightsVerified:false,releaseAuthorized:false};
}
const mode=process.argv[2];
if(mode==='create'){
 const root=requirePrivateRoot();
 const output=path.join(root,'LOCAL_CREATOR_PROVENANCE_MANIFEST.json');
 const assets=[];
 for(const [id,relativePath] of files){const data=await readFile(path.join(root,relativePath));assets.push({id,relativePath,sha256:sha(data),bytes:data.length});}
 const payload={schema:'staar-local-creator-provenance-v1',createdAt:new Date().toISOString(),declaration:'Created in-house via AI (owner-authorized declaration; creation platform and license terms not independently verified)',scope:'Owner-provided provenance statement and byte identity only; NOT independent rights clearance, chain-of-title proof, Apple signing, device certification, or production release authorization',assets};
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');
 const document={payload,signature:{algorithm:'Ed25519',keyType:'ephemeral-local-development-key',publicKeyPem:publicKey.export({type:'spki',format:'pem'}),signatureBase64:sign(null,Buffer.from(stable(payload)),privateKey).toString('base64')}};
 await writeFile(output,JSON.stringify(document,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({output,assetCount:assets.length,signatureVerified:verify(null,Buffer.from(stable(payload)),publicKey,Buffer.from(document.signature.signatureBase64,'base64')),releaseAuthorized:false},null,2));
}else if(mode==='verify'){
 const root=requirePrivateRoot();
 const output=path.join(root,'LOCAL_CREATOR_PROVENANCE_MANIFEST.json');
 const d=JSON.parse(await readFile(output,'utf8'));
 if(d.payload.schema!=='staar-local-creator-provenance-v1'||d.payload.assets.length!==11)throw Error('manifest contract invalid');
 if(!verify(null,Buffer.from(stable(d.payload)),createPublicKey(d.signature.publicKeyPem),Buffer.from(d.signature.signatureBase64,'base64')))throw Error('signature invalid');
 for(const [id,relativePath] of files){const a=d.payload.assets.find(x=>x.id===id);if(!a||a.relativePath!==relativePath)throw Error('asset identity mismatch '+id);const b=await readFile(path.join(root,relativePath));if(a.sha256!==sha(b)||a.bytes!==b.length)throw Error('asset hash mismatch '+id);}
 console.log(JSON.stringify({manifestVerified:true,assetCount:11,localCreatorDeclaration:true,independentRightsVerified:false,releaseAuthorized:false},null,2));
}else if(mode!==undefined)throw Error('usage: node scripts/asset-provenance-manifest.mjs create|verify');
