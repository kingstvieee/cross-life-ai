import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';import {tmpdir} from 'node:os';
import {TEN_WORLD_SHA,loadInternalTenWorldQaAssets,isWorldQaBuild,inspectWorldQaBytes}
 from '../scene-src/internal-ten-world-qa.mjs';
const env={EAS_BUILD_PROFILE:'preview',STAAR_IPHONE_ONLY_QA:'1',
 EXPO_PUBLIC_WORLD_COLLISION_QA:'1',EXPO_PUBLIC_GUARDIAN_DEVICE_QA:'1'};
test('Ten separate pinned world variants, including the singles room',()=>{
 assert.equal(Object.keys(TEN_WORLD_SHA).length,10);
 for(const sha of Object.values(TEN_WORLD_SHA))assert.match(sha,/^[a-f0-9]{64}$/);
 assert.ok(TEN_WORLD_SHA['relationships-singles']);
});
test('Private worlds are available only for physical iPhone QA',()=>{
 assert.equal(isWorldQaBuild(env),true);
 for(const key of Object.keys(env))assert.equal(isWorldQaBuild({...env,[key]:'0'}),false,key);
});
test('Missing candidate worlds fail before build, not at runtime',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'staar-private-world-'));
 try{
 await assert.rejects(loadInternalTenWorldQaAssets(root,{env}),/private_world_missing_/);
 assert.equal(await loadInternalTenWorldQaAssets(root,{env:{}}),null);
 }finally{await rm(root,{recursive:true,force:true})}
});
test('Production refuses accidental private world leakage',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'staar-private-world-'));
 try{
 const dir=path.join(root,'assets/private-world-qa');await mkdir(dir,{recursive:true});
 await writeFile(path.join(dir,'work-command.glb'),'not for production');
 await assert.rejects(loadInternalTenWorldQaAssets(root,{env:{EAS_BUILD_PROFILE:'production'}}),
 /private_world_files_present_in_production/);
 }finally{await rm(root,{recursive:true,force:true})}
});
test('Spoofed world JSON or fake GLB cannot be loaded',()=>{
 assert.throws(()=>inspectWorldQaBytes(Buffer.alloc(1000),'home-residence'),/private_world_invalid_header/);
});
