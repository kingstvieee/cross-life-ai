import { build } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadApprovedArmoredGuardianAsset } from './approved-guardian-asset.mjs';
import { loadApprovedProductionWorldAssets } from './approved-world-assets.mjs';
import { loadInternalGuardianQaAsset, isInternalGuardianQaBuild } from './internal-guardian-qa.mjs';
import {loadInternalTenWorldQaAssets, isWorldQaBuild} from './internal-ten-world-qa.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const approvedGuardian=await loadApprovedArmoredGuardianAsset(root);
const guardianData=approvedGuardian ? JSON.stringify(approvedGuardian) : 'null';
// The private 3D review model is loaded only inside an explicitly flagged
// physical-iPhone preview; production never receives its private base64 bytes.
// Only explicit private-device QA builds may embed private model bytes.
const privateQaBuild = process.env.STAAR_PRIVATE_DEVICE_QA_BUILD === '1';
// Both public profile flags and EAS's internal build profile must match.
// A stale shell environment must never turn private files into a release bundle.
if (privateQaBuild && (!isInternalGuardianQaBuild() || !isWorldQaBuild())) {
  throw new Error('Private 3D QA mode requires the exact registered-iPhone preview profile');
}
// Even with the private QA switch off, refuse accidentally staged private files
// from any production source checkout rather than trusting the bundler to omit them.
if (process.env.EAS_BUILD_PROFILE === 'production') {
  await loadInternalGuardianQaAsset(root);
  await loadInternalTenWorldQaAssets(root);
}
const privateGuardianQa = privateQaBuild ? await loadInternalGuardianQaAsset(root) : null;
const internalHomeReview = privateQaBuild && Boolean(privateGuardianQa) && process.env.STAAR_INTERNAL_HOME_REVIEW === '1';
const privateGuardianData = privateGuardianQa ? JSON.stringify(privateGuardianQa) : 'null';
const privateWorlds = privateQaBuild ? await loadInternalTenWorldQaAssets(root) : null;
const privateWorldsData = privateWorlds ? JSON.stringify(privateWorlds) : 'null';
if (!privateQaBuild && (privateGuardianQa || privateWorlds || internalHomeReview)) {
  throw new Error('Private QA data must not enter production runtime');
}
const approvedWorlds=await loadApprovedProductionWorldAssets(root);
const worldData=approvedWorlds ? JSON.stringify(approvedWorlds) : 'null';
const result=await build({entryPoints:[path.join(root,'worlds.js')],bundle:true,minify:true,format:'iife',target:'es2020',write:false,legalComments:'inline'});
const code=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const hubArtwork={};
for(const id of ['home','work','creativity','wellbeing','relationships','events','style','staarverse','staarsonic','diggitstaar']){
  hubArtwork[id]='data:image/jpeg;base64,'+(await readFile(path.join(root,'portal-art',id+'.jpg'))).toString('base64');
}
hubArtwork.skyline='data:image/png;base64,'+(await readFile(path.join(root,'../assets/images/staarwardd/toronto-skyline-pan.png'))).toString('base64');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=3"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:;"><title>STAARWARDD 3D environment</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#030713;color:#edf4ff;font-family:system-ui,sans-serif}canvas{display:block;width:100%;height:100%;touch-action:none}header{position:absolute;inset:16px 16px auto;pointer-events:none;text-shadow:0 2px 8px #000;display:flex;justify-content:space-between;gap:12px}#title{font-size:13px;letter-spacing:2px}button{background:#111923e8;color:#f2f5fb;border:1px solid #9ba7b7;padding:10px 13px;border-radius:10px;min-height:44px;cursor:pointer}header button{pointer-events:auto}footer{position:absolute;bottom:12px;left:12px;right:12px;font-size:10px;line-height:18px;text-shadow:0 1px 5px #000;pointer-events:none}#actions{display:flex;gap:8px;overflow-x:auto;pointer-events:auto;padding-top:6px}#actions button{white-space:nowrap;font-size:11px}button:focus-visible{outline:3px solid #69d7ff;outline-offset:2px}</style></head><body><canvas aria-label="Navigable three-dimensional portal environment"></canvas><header><span id="title">STAARWARDD</span><button id="reset" aria-label="Reset 3D camera">Reset view</button></header><footer><span id="status" role="status">Preparing 3D environment…</span><nav id="actions" aria-label="World controls"></nav></footer><script>window.STAAR_HUB_ARTWORK=${JSON.stringify(hubArtwork)};window.STAAR_APPROVED_GUARDIAN_MODEL=${guardianData};window.STAAR_PRIVATE_GUARDIAN_QA_MODEL=${privateGuardianData};window.STAAR_INTERNAL_HOME_REVIEW=${internalHomeReview};window.STAAR_PRIVATE_DEVICE_QA_BUILD=${privateQaBuild};window.STAAR_PRIVATE_WORLDS_QA=${privateWorldsData};window.STAAR_APPROVED_WORLD_ASSETS=${worldData};</script><script>/*STAAR_WORLD_CONFIG*/</script><script>${code}</script></body></html>`;
const generated=path.join(root,'../generated');await mkdir(generated,{recursive:true});
await writeFile(path.join(generated,'world-runtime.ts'),`// Generated by scene-src/build.mjs.\nconst html=${JSON.stringify(html)};\nexport function worldSceneHtml(world:string,variant:'realm'|'singles'='realm',session:string='',qaMode:boolean=false,worldQaMode:boolean=false,guardianPresentation:boolean=false,reduceGuardianMotion:boolean=false){if(session&&!/^[A-Za-z0-9:_-]{1,128}$/.test(session))throw new Error('Invalid scene session');const allowed=['hub','home','work','creativity','wellbeing','relationships','events','style','staarverse','staarsonic','diggitstaar'];if(!allowed.includes(world))throw new Error('Unknown world');return html.replace('/*STAAR_WORLD_CONFIG*/','window.STAAR_WORLD='+JSON.stringify(world)+';window.STAAR_VARIANT='+JSON.stringify(world==='relationships'&&variant==='singles'?'singles':'realm')+';window.STAAR_SCENE_SESSION='+JSON.stringify(session)+';window.STAAR_GUARDIAN_QA='+JSON.stringify(qaMode===true)+';window.STAAR_WORLD_COLLISION_QA='+JSON.stringify(worldQaMode===true)+';window.STAAR_GUARDIAN_PRESENTATION='+JSON.stringify(world==='hub'&&guardianPresentation===true)+';window.STAAR_REDUCE_GUARDIAN_MOTION='+JSON.stringify(reduceGuardianMotion===true)+';');}\n`);
await writeFile(path.join(root,'../public/world-runtime.html'),html);
await writeFile(path.join(generated,'THREE-LICENSE.txt'),await readFile(path.join(root,'node_modules/three/LICENSE')));
console.log('Offline 3D runtime built:',Math.round(Buffer.byteLength(html)/1024),'KiB');
