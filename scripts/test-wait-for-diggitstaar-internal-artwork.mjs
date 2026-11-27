import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForProtectedArt} from './wait-for-diggitstaar-internal-artwork.mjs';

const lane = {STAAR_WINGED_SIGNED_INTERNAL_REVIEW:'1', STAAR_PRIVATE_PORTAL_ARTWORK_AUTHORIZED:'1', STAAR_DIGGITSTAAR_MASTER_PATH:'/private/studio.jpeg'};
const manual = {...lane, STAAR_DIGGITSTAAR_MANUAL_TRANSFER:'1', STAAR_DIGGITSTAAR_WAIT_SECONDS:'2'};
const file = {isFile:() => true, isSymbolicLink:() => false, mode:0o600};
const absent = () => {throw Object.assign(new Error('absent'),{code:'ENOENT'});};
test('unsigned and unapproved lanes fail before inspecting the file', async () => {
  await assert.rejects(waitForProtectedArt({...lane, STAAR_WINGED_SIGNED_INTERNAL_REVIEW:'0'}, {inspect:()=>assert.fail()}), /not authorized/);
  await assert.rejects(waitForProtectedArt({...lane, STAAR_PRIVATE_PORTAL_ARTWORK_AUTHORIZED:'0'}, {inspect:()=>assert.fail()}), /not authorized/);
});
test('ordinary protected runner mode does not pause for a missing file', async () => {
  await assert.rejects(waitForProtectedArt(lane,{inspect:absent,sleep:()=>assert.fail()}), /No archive/);
});
test('manual mode waits only until the atomic final regular owner-only file arrives', async () => {
  let t=0;
  await waitForProtectedArt(manual,{now:()=>t,sleep: n=>{t+=n;},inspect:()=>t ? file : absent()});
  assert.equal(t,1000);
  await assert.rejects(waitForProtectedArt(manual,{inspect:()=>({...file,mode:0o644})}), /owner-readable/);
  await assert.rejects(waitForProtectedArt(manual,{inspect:()=>({...file,isSymbolicLink:()=>true})}), /regular file/);
});
test('manual window expires and cannot be configured to wait indefinitely', async () => {
  let t=0;
  await assert.rejects(waitForProtectedArt(manual,{now:()=>t,sleep:n=>{t+=n;},inspect:absent}), /No archive/);
  assert.equal(t,2000);
  await assert.rejects(waitForProtectedArt({...manual,STAAR_DIGGITSTAAR_WAIT_SECONDS:'181'}), /Invalid/);
});
