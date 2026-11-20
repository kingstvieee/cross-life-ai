import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async file=>readFile(new URL('../'+file,import.meta.url),'utf8');
test('release evidence intake never certifies rights, device, or Apple signing',async()=>{
 const source=await read('scripts/verify-private-evidence-intake.mjs');
 assert.match(source,/releaseAuthorized:false/);
 assert.match(source,/deviceCertification:false/);
 assert.match(source,/rightsCertification:false/);
 assert.match(source,/intakeConsistent:problems\.length===0/);
});
test('all ten worlds have distinct native QA keys and explicit manual export',async()=>{
 const source=await read('src/iphone-qa-archive.ts');
 const names=['home-residence','work-command','creativity-dream','wellbeing-health','relationships-realm','relationships-singles','events-village','style-closet','staarverse-universe','staarsonic-studio'];
 for(const name of names)assert.ok(source.includes("'"+name+"'"),'missing '+name);
 assert.match(source,/physicalIphoneCertification:'UNVERIFIED'/);
 assert.match(source,/finalWorldsApproved:0/);
 assert.match(source,/deviceOwnerAttestation:false/);
 const ui=await read('components/staarwardd/world-scene.tsx');
 assert.match(ui,/Share\.share\(\{title:'STAARWAARDD Ten-World QA — Review Only'/);
 assert.match(ui,/Share\.share\(\{title:'STAARWAARDD Guardian Device QA'/);
 assert.match(ui,/EXPO_PUBLIC_GUARDIAN_DEVICE_QA === '1'/);
 assert.match(ui,/EXPO_PUBLIC_WORLD_COLLISION_QA === '1'/);
});
test('release loader refuses review-only guardian and world hashes',async()=>{
 const guardian=await read('scene-src/approved-guardian-asset.mjs');
 const worlds=await read('scene-src/approved-world-assets.mjs');
 assert.match(guardian,/build228_release_requirements_pending/);
 assert.match(worlds,/review_only_collider_model/);
 assert.match(worlds,/founderVisualApproved!==true/);
 assert.match(worlds,/deviceCaptureVerified!==true/);
});
