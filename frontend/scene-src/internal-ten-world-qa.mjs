/**
 * STAAR Hub ten-world private TestFlight QA only.
 * Owner authorized these candidate worlds for testing. This does NOT validate
 * commercial release, final art/rights, Apple signing, or physical collisions.
 */
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
export const TEN_WORLD_SHA=Object.freeze({
 'relationships-realm':'8541fb3c7d611629b81ee1ba32c9ea578819ff90fc00fa3032a03588590f2fd4',
 'style-closet':'4d7a967532fd3effaea1074c1b370584a7a1334fca7978901303514c63a0b15f',
 'events-village':'56ca2a915e3ec92a367e8483237cec48633e00f0158751c108c4cfbe5847bdd7',
 'work-command':'faedc9bbca605a432a31dd4f78e47120a6fb89e2747e72dbc0b56e153cf7e94b',
 'wellbeing-health':'aa9648c1b65e0d919808ed81ac5522d2421fc56d703a2b9d0b4880f05aff96db',
 'staarverse-universe':'0b81698d02718f5d72a6a8ef811d9f72d0c21f5f644eb6f82bd277a91c77ebdf',
 'home-residence':'d92331d7d14aa76b41b524c1236a3589a6a654920e1ce02a90df575e6f65ad60',
 'staarsonic-studio':'a957fbe433e0a180178007c9bf4375905decc9d39405a6fefef6dc8b0804d7af',
 'relationships-singles':'03f3040ec1d97c2c9206a56d99220083081e5a3d75da0669234ea35f7ff45a3a',
 'creativity-dream':'0524f57a726deb9deb702a332680a13b23bae2a5f85101ce8957b494bfcda11b'
});
export function isWorldQaBuild(env=process.env){
 return env.EAS_BUILD_PROFILE==='preview' && env.STAAR_IPHONE_ONLY_QA==='1' &&
   env.EXPO_PUBLIC_WORLD_COLLISION_QA==='1' && env.EXPO_PUBLIC_GUARDIAN_DEVICE_QA==='1';
}
export function inspectWorldQaBytes(bytes,key){
 if(!Buffer.isBuffer(bytes)||bytes.length<100||bytes.length>2_000_000)throw Error('private_world_invalid_size_'+key);
 if(bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)throw Error('private_world_invalid_header_'+key);
 const len=bytes.readUInt32LE(12);
 if(len<50||len%4||len+28>bytes.length||bytes.toString('ascii',16,20)!=='JSON')throw Error('private_world_invalid_json_'+key);
 let gltf;try{gltf=JSON.parse(bytes.toString('utf8',20,20+len))}catch{throw Error('private_world_invalid_json_'+key)}
 if(gltf?.asset?.version!=='2.0'||!gltf.meshes?.length||!gltf.extras?.staarNavigationCandidate)
   throw Error('private_world_navigation_missing_'+key);
 if((gltf.images??[]).some(x=>x.uri&&!x.uri.startsWith('data:'))||
    (gltf.buffers??[]).some(x=>x.uri&&!x.uri.startsWith('data:')))
   throw Error('private_world_external_assets_'+key);
 const sha=crypto.createHash('sha256').update(bytes).digest('hex');
 if(sha!==TEN_WORLD_SHA[key])throw Error('private_world_hash_changed_'+key);
 return sha;
}
export async function loadInternalTenWorldQaAssets(root,{env=process.env}={}){
 const dirname=path.join(root,'assets','private-world-qa');
 if(!isWorldQaBuild(env)){
   if(env.EAS_BUILD_PROFILE==='production'){
     try{const files=await fs.readdir(dirname);if(files.some(x=>x.endsWith('.glb')))throw Error('private_world_files_present_in_production')}
     catch(e){if(e.code!=='ENOENT')throw e}
   }
   return null;
 }
 const worlds={};
 for(const key of Object.keys(TEN_WORLD_SHA)){
   const file=path.join(dirname,key+'.glb');
   let data;try{data=await fs.readFile(file)}catch(e){throw Error('private_world_missing_'+key+':'+e.code)}
   const sha=inspectWorldQaBytes(data,key);
   worlds[key]={modelSha256:sha,glbBase64:data.toString('base64'),
     internalQaOnly:true,productionApproved:false};
 }
 return Object.freeze(worlds);
}
