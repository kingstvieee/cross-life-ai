/** Downloaded bundle is AES-256-GCM ciphertext only.
 * Decrypt in ephemeral Codemagic environment; NEVER log the private key or
 * commit source GLBs, portraits, or private AAC to public GitHub.
 */
import fs from 'node:fs';
import {createHash,createDecipheriv} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const input=process.argv[2];
const keyHex=process.env.STAAR_PRIVATE_B110_KEY;
if(!input||!keyHex||!/^[a-f0-9]{64}$/i.test(keyHex))throw Error('build110_private_decryption_key_not_provisioned');
const data=fs.readFileSync(input);
const hash=createHash('sha256').update(data).digest('hex');
if(hash!=='1a9a40835361ce71633c71eab7ac9ac392ec12e3a936397ed718299b4bd6a1d0')
 throw Error('build110_encrypted_asset_digest_mismatch');
if(data.subarray(0,8).toString()!=='STARB110')throw Error('build110_wrong_asset_header');
const nonce=data.subarray(8,20),tag=data.subarray(data.length-16),enc=data.subarray(20,data.length-16);
const dec=createDecipheriv('aes-256-gcm',Buffer.from(keyHex,'hex'),nonce);
dec.setAAD(Buffer.from('STAAR_PRIVATE_IPHONE_110'));dec.setAuthTag(tag);
const plaintext=Buffer.concat([dec.update(enc),dec.final()]);
const temp=path.join(os.tmpdir(),'staar-private-110-'+process.pid+'.zip');
try{
 fs.writeFileSync(temp,plaintext,{mode:0o600});
 const names=execFileSync('unzip',['-Z1',temp],{encoding:'utf8'}).trim().split('\n');
 const allowed=(n)=>n==='world-hashes.json'||
   n==='frontend/scene-src/assets/private-guardian-qa/guardian-b250-iphone-qa.glb'||
   /^frontend\/scene-src\/assets\/private-world-qa\/[a-z0-9-]+\.glb$/.test(n)||
   n==='frontend/assets/audio/Starward_Guardian_Approved_AAC_iOS.m4a'||
   n==='frontend/components/staarwardd/startup-approved-soundtrack-source.native.ts';
 if(names.some(n=>!allowed(n)||n.includes('..')))throw Error('build110_unexpected_archive_filename');
 if(names.length!==14)throw Error('build110_wrong_private_archive_file_count_'+names.length);
 execFileSync('unzip',['-oq',temp,'-d',path.resolve(process.cwd())],{stdio:'pipe'});
 console.log('Verified and staged encrypted private 110 assets (exact 10 worlds, B250, AAC).');
}finally{fs.rmSync(temp,{force:true});plaintext.fill(0)}
