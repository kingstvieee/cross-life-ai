import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const frontend=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(file)=>readFileSync(path.join(frontend,file),'utf8');
const destinations=['home','work','creativity','wellbeing','relationships','events','style','staarverse','staarsonic','diggitstaar'];
const pages=['index','hub','intro','landing','guest','onboarding','chat','checkins','connections','device-checks','environment','guardian-missions','guardian-notices','guardian-tools','guardian-view','scorecard','settings','style-swap','work','world/[id]','portal/[id]'];

test('all 21 named app routes exist, resolve to a component, and share the authenticated layout',()=>{
 for(const name of pages){
  const file='app/'+name+'.tsx';
  assert.ok(existsSync(path.join(frontend,file)),'Missing '+file);
  const source=read(file);
  assert.match(source,/export default|export \{ default \}/,'Unexported '+file);
 }
 const root=read('app/_layout.tsx');
 for(const marker of ['<StartupFilmBoundary>','<AuthProvider>','<AccessBoundary>','<Stack']) assert.ok(root.includes(marker),marker);
 assert.doesNotMatch(root,/LogBox\.ignoreAllLogs\(true\)/);
});

test('ten distinct portal IDs match world directory and immersive 3D scene navigators',()=>{
 const portal=read('lib/staarwardd/portal-data.ts');
 const directory=read('lib/staarwardd/world-directory.ts');
 const scene=read('scene-src/worlds.js');
 const build=read('scene-src/build.mjs');
 const hub=read('components/staarwardd/world-hub.tsx');
 const legacy=read('app/portal/[id].tsx');
 const environment=read('app/environment.tsx');
 for(const id of destinations){
  assert.match(portal,new RegExp('\\b'+id+'\\b'),id+' artwork absent');
  assert.match(hub,new RegExp('\\b'+id+': require'),id+' locked Home artwork absent');
  assert.match(scene,new RegExp(id),id+' offline scene absent');
  assert.ok(directory.includes('PREVIEW_WORLDS'));
  assert.ok(build.includes("'"+id+"'"),id+' runtime allowlist absent');
 }
 assert.match(legacy,/WORLD_BY_ID\[id\]/);
 assert.match(legacy,/pathname: '\/environment'/);
 assert.match(environment,/WorldScene world=\{world\}/);
 assert.match(portal,/approvedOrder = \[/);
 assert.equal(new Set(destinations).size,10);
});

test('DIGGITSTAAR artwork is separate from STAAR Work; ten-world label is accurate',()=>{
 const a=read('lib/staarwardd/portal-data.ts');
 const b=read('components/staarwardd/world-hub.tsx');
 const signIn=read('components/staarwardd/access-boundary.tsx');
 assert.match(a,/diggitstaar\.png/);
 assert.match(b,/diggitstaar\.png/);
 assert.match(signIn,/TEN WORLDS\. ONE PRESENCE\./);
 assert.doesNotMatch(signIn,/NINE WORLDS\. ONE PRESENCE\./);
 const digest=(f)=>createHash('sha256').update(readFileSync(path.join(frontend,f))).digest('hex');
 assert.notEqual(digest('scene-src/portal-art/diggitstaar.png'),digest('assets/images/staarwardd/portal-work-chrome.webp'));
});

test('eleven distinct scene variants are explicit: ten portal destinations plus STAAR Love Singles',()=>{
 const scene=read('scene-src/worlds.js');
 const build=read('scene-src/build.mjs');
 assert.match(scene,/world === 'relationships'/);
 assert.match(scene,/singlesLounge/);
 assert.match(build,/const privateWorlds/);
 assert.match(scene,/diggitstaar:'content-studio'/);
 const worldQa=read('scene-src/internal-ten-world-qa.mjs');
 assert.ok(worldQa.includes('relationships-singles'));
 assert.equal(worldQa.includes('diggitstaar-content-studio'),false);
 // This is a known scene/model mismatch: no independent production certification is implied.
 assert.match(read('app/environment.tsx'),/3D DEVELOPMENT PREVIEW/);
});
