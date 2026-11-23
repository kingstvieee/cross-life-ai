import {readFile,access} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
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
const diggitArt='scene-src/portal-art/diggitstaar.png';
const diggitPath=path.join(root,diggitArt);
const workPath=path.join(root,'assets/images/staarwardd/locked/work.png');
const digest=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
let diggitDistinct=false;
try {diggitDistinct=(await digest(diggitPath))!==(await digest(workPath)) && hub.includes('portal-art/diggitstaar.png') && portal.includes('portal-art/diggitstaar.png');} catch {}
check('DIGGITSTAAR distinct art wired',diggitDistinct,'Dedicated DIGGITSTAAR PNG differs from locked Work art and is wired to Hub and portal data; independent owner approval remains a separate release gate');
check('guest preview boundary',guest.includes('<WorldHub onSignIn=')&&hub.includes('if (onSignIn) { setInspectedPortal'), 'Static route/preview guard only; device navigation not certified');
check('homepage 3D scene wired',hub.includes('<WorldScene world="hub" embedded'), 'Source wiring only; device render not certified');
check('Atlas/Kaia locked reference',await access(path.join(root,'assets/images/staarwardd/atlas-kaia-locked.jpeg')).then(()=>true,()=>false),'Reference photo only; does not prove a holographic rig');
const companionUI=await read('components/staarwardd/cinematic-hub.tsx');
const companionService=await read('src/companions.ts');
check('Atlas/Kaia companion selector wired',companionUI.includes('COMPANIONS.map(')&&companionUI.includes('speakCompanion(')&&companionService.includes('voice-preview/'),'Native selector and server voice-preview code wired; does not certify playback on a physical device');
check('Atlas and Kaia holographic interaction',false,'3D asset manifest on feature branch names Kaya (not Kaia), contains no skeletal animation, and is not integrated into production 3D scene; on-device verification outstanding');
check('portal images in directory',required.every(id=>directory.includes(id)),'Nine locked reference portals; DIGGITSTAAR remains an additional entry');
check('portal-data distinct DIGGITSTAAR image',!portal.includes('id: "diggitstaar", name: "DIGGITSTAAR", image: require("@/assets/images/staarwardd/portal-work-chrome.webp")'),'Reject shared Work artwork');
const failed=checks.filter(x=>x.status==='BLOCKED');
console.log(JSON.stringify({audit:'STAARWAARDD locked visuals and guest/companion audit',checks,passed:checks.length-failed.length,blocked:failed.length,deviceCertified:false},null,2));
if(failed.length)process.exitCode=1;
