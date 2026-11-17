/** Build 238 — local-only ten-world QA archive (not an Apple acceptance ledger).
 * Contains whitelisted metrics, no facial media, audio, credentials, location,
 * identifiers beyond GLB content SHA and one transient renderer session.
 */
import type {QaSummary} from './iphone-qa-controls.ts';

export const WORLD_QA_KEYS=Object.freeze([
 'home-residence','work-command','creativity-dream','wellbeing-health',
 'relationships-realm','relationships-singles','events-village','style-closet',
 'staarverse-universe','staarsonic-studio',
] as const);
type WorldKey=(typeof WORLD_QA_KEYS)[number];
export const WORLD_QA_STORAGE_KEY='staarwardd:build238:qa-local-worlds-v1';
type StorageLike={
 getItem(key:string):Promise<string|null>;
 setItem(key:string,value:string):Promise<unknown>;
 removeItem(key:string):Promise<unknown>;
};
type Archive={schema:'staar-iphone-build238-world-archive-v1';worlds:Partial<Record<WorldKey,QaSummary>>};
const empty=():Archive=>({schema:'staar-iphone-build238-world-archive-v1',worlds:{}});
const validWorldKey=(k:string):k is WorldKey=>WORLD_QA_KEYS.some(world=>world===k);
export function worldQaKey(scene:string,variant:string):WorldKey|null {
 const key:Record<string,WorldKey>={
  home:'home-residence',work:'work-command',creativity:'creativity-dream',
  wellbeing:'wellbeing-health',events:'events-village',style:'style-closet',
  staarverse:'staarverse-universe',staarsonic:'staarsonic-studio',
 };
 const computed=scene==='relationships'
  ?(variant==='singles'?'relationships-singles':'relationships-realm')
  :key[scene];
 return typeof computed==='string'&&validWorldKey(computed)?computed:null;
}
export async function readWorldQaArchive(storage:StorageLike):Promise<Archive>{
 const raw=await storage.getItem(WORLD_QA_STORAGE_KEY);
 if(!raw||raw.length>80000)return empty();
 try{
  const source:unknown=JSON.parse(raw);
  if(!source||typeof source!=='object'||Array.isArray(source))return empty();
  const obj=source as Record<string,unknown>;
  if(obj.schema!=='staar-iphone-build238-world-archive-v1'||
    !obj.worlds||typeof obj.worlds!=='object'||Array.isArray(obj.worlds))return empty();
  const entries=obj.worlds as Record<string,unknown>,out=empty();
  for(const k of WORLD_QA_KEYS){
   const row=entries[k];
   if(!row||typeof row!=='object'||Array.isArray(row))continue;
   const item=row as Record<string,unknown>;
   if(item.schema!=='staar-iphone-build238-local-qa-export-v1'||item.kind!=='world'||
      item.certification!=='UNVERIFIED'||item.physicalIphoneOwnerAttestation!==false||
      typeof item.scene!=='string'||typeof item.variant!=='string'||
      worldQaKey(item.scene,item.variant)!==k||
      !item.metrics||typeof item.metrics!=='object'||Array.isArray(item.metrics))continue;
   // Locally saved snapshots are still diagnostic only, not proof of device identity.
   out.worlds[k]=row as QaSummary;
  }
  return out;
 }catch{return empty();}
}
export async function saveWorldQaCapture(storage:StorageLike,report:QaSummary):Promise<Archive>{
 if(report.kind!=='world'||report.certification!=='UNVERIFIED'||
    report.physicalIphoneOwnerAttestation!==false)throw Error('qa_not_review_only');
 const key=worldQaKey(report.scene,report.variant);
 if(!key)throw Error('qa_world_not_supported');
 const archive=await readWorldQaArchive(storage);
 archive.worlds[key]=report;
 const payload=JSON.stringify(archive);
 if(payload.length>80000)throw Error('qa_archive_too_large');
 await storage.setItem(WORLD_QA_STORAGE_KEY,payload);
 return archive;
}
export function worldQaProgress(archive:Archive){
 const captured=WORLD_QA_KEYS.filter(k=>Boolean(archive.worlds[k]));
 const withModel=captured.filter(k=>archive.worlds[k]?.metrics.modelBound===true);
 const missing=WORLD_QA_KEYS.filter(k=>!archive.worlds[k]);
 return {captured:captured.length,total:10,withModel:withModel.length,missing};
}
export function exportWorldQaArchive(archive:Archive,exportedAt:string):string{
 const progress=worldQaProgress(archive);
 const worlds=Object.fromEntries(WORLD_QA_KEYS.filter(k=>archive.worlds[k])
   .map(k=>[k,{...archive.worlds[k],certification:'UNVERIFIED',
    physicalIphoneOwnerAttestation:false}]));
 return JSON.stringify({
  schema:'staar-iphone-build238-world-bundle-v1',exportedAt,
  totalWorlds:progress.total,diagnosticsCaptured:progress.captured,
  loadedModelDiagnostics:progress.withModel,missing:progress.missing,
  physicalIphoneCertification:'UNVERIFIED',
  finalWorldsApproved:0,
  deviceOwnerAttestation:false,
  results:worlds,
 },null,2);
}
export async function clearWorldQaArchive(storage:StorageLike){
 await storage.removeItem(WORLD_QA_STORAGE_KEY);
 return empty();
}
