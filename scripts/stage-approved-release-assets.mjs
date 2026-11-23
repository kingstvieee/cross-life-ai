/** Owner-approved asset package delivery. Never accepts the private B250 QA archive. */
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
const url=process.env.STAAR_APPROVED_ASSET_URL;
const digest=process.env.STAAR_APPROVED_ASSET_SHA256;
if(!url || !/^https:\/\//.test(url) || !/^[a-f0-9]{64}$/i.test(digest||''))
  throw Error('approved_release_asset_delivery_not_configured');
const file=path.join(tmpdir(),'staar-approved-'+process.pid+'.zip');
try {
  execFileSync('curl',['--fail','--silent','--show-error','--location','--max-time','120','--output',file,url],{stdio:'pipe'});
  const bytes=await readFile(file);
  if(bytes.length>90*1024*1024)throw Error('approved_asset_archive_too_large');
  if(createHash('sha256').update(bytes).digest('hex')!==digest.toLowerCase())
    throw Error('approved_asset_archive_digest_mismatch');
  const names=execFileSync('unzip',['-Z1',file],{encoding:'utf8'}).trim().split('\n');
  const root=path.resolve('frontend/scene-src/assets');
  const guardian=['guardian-armored-rig.glb','guardian-armor-asset-receipt.json'];
  const worlds=['home-residence','work-command','creativity-dream','wellbeing-health','relationships-realm','relationships-singles','events-village','style-closet','staarverse-universe','staarsonic-studio'];
  const expected=[...guardian,...worlds.flatMap(w=>['worlds/'+w+'.glb','worlds/'+w+'.json'])];
  const optional=worlds.map(w=>'worlds/'+w+'.collision.glb');
  if(new Set(names).size!==names.length || names.some(n=>!expected.includes(n)&&!optional.includes(n))
    || expected.some(n=>!names.includes(n)))throw Error('approved_asset_archive_file_manifest_invalid');
  for(const name of names) {
    const out=path.resolve(root,name);
    if(!out.startsWith(root+path.sep))throw Error('approved_asset_path_escape');
    const raw=execFileSync('unzip',['-p',file,name],{maxBuffer:20*1024*1024});
    if(raw.length===0 || raw.length>18*1024*1024)throw Error('approved_asset_invalid_member_size');
    await mkdir(path.dirname(out),{recursive:true});
    await writeFile(out,raw,{mode:0o600,flag:'wx'});
  }
  console.log('Staged approved asset candidate files for strict model and receipt validation');
} finally {await rm(file,{force:true});}
