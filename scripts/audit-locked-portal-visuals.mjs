import {readFile,access} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('frontend');
const read=async p=>readFile(path.join(root,p),'utf8');
const required=['home','work','creativity','wellbeing','relationships','events','style','staarverse','staarsonic'];
const locked={home:'home',work:'work',creativity:'creativity',wellbeing:'wellbeing',relationships:'love',events:'events',style:'style',staarverse:'staarverse',staarsonic:'staarsonic'};
const checks=[];
const check=(name,ok,detail)=>checks.push({name,status:ok?'PASS':'BLOCKED',detail});
const hub=await read('components/staarwardd/world-hub.tsx');
const guest=await read('components/staarwardd/access-boundary.tsx');
const directory=await read('lib/staarwardd/world-directory.ts');
const portal=await read('lib/staarwardd/portal-data.ts');
for(const id of required){
 const file='assets/images/staarwardd/locked/'+locked[id]+'.png';
 let exists=false;try{await access(path.join(root,file));exists=true;}catch{}
 check('locked artwork: '+id,exists&&hub.includes('locked/'+locked[id]+'.png')&&directory.includes(id),file);
}
check('DIGGITSTAAR distinct approved art',false,'Current hub references portal-work-chrome.webp; no separate locked DIGGITSTAAR master');
check('guest preview boundary',guest.includes('<WorldHub onSignIn=')&&hub.includes('if (onSignIn) { setInspectedPortal'), 'Static route/preview guard only; device navigation not certified');
check('homepage 3D scene wired',hub.includes('<WorldScene world="hub" embedded'), 'Source wiring only; device render not certified');
check('Atlas/Kaia locked reference',await access(path.join(root,'assets/images/staarwardd/atlas-kaia-locked.jpeg')).then(()=>true,()=>false),'Reference photo only; does not prove a holographic rig');
check('Atlas and Kaia holographic interaction',false,'No verified on-device hologram animation, voice or companion selection evidence');
check('portal images in directory',required.every(id=>directory.includes(id)),'Nine locked reference portals; DIGGITSTAAR remains an additional entry');
check('portal-data distinct DIGGITSTAAR image',!portal.includes('id: "diggitstaar", name: "DIGGITSTAAR", image: require("@/assets/images/staarwardd/portal-work-chrome.webp")'),'Reject shared Work artwork');
const failed=checks.filter(x=>x.status==='BLOCKED');
console.log(JSON.stringify({audit:'STAARWAARDD locked visuals and guest/companion audit',checks,passed:checks.length-failed.length,blocked:failed.length,deviceCertified:false},null,2));
if(failed.length)process.exitCode=1;
