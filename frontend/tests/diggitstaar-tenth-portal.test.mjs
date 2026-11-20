import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
test('DIGGITSTAAR is a distinct tenth portal accessible from the hub', async () => {
 const hub = await read('components/staarwardd/world-hub.tsx');
 assert.match(hub, /Enter DIGGITSTAAR business command centre/);
 assert.match(hub, /router\.push\('\/diggitstaar'\)/);
});
test('DIGGITSTAAR workload is account scoped and Gmail stays fail closed until OAuth is ready', async () => {
 const studio = await read('app/diggitstaar.tsx');
 assert.match(studio, /diggitstaar:studio-command:v1/);
 assert.match(studio, /AsyncStorage\.setItem\(key/);
 assert.match(studio, /Authorize native Gmail read-only access/);
 assert.match(studio, /!gmailConnected && gmailConfigured && button/);
 assert.match(studio, /Open Gmail directly · no setup needed/);
 assert.match(studio, /Not connected/);
 assert.match(studio, /Native inbox access never sends, deletes, modifies, or automatically replies to email/);
 for (const stage of ['Inbox', 'In production', 'Awaiting approval', 'Delivered']) assert.ok(studio.includes(stage));
});

test('seated 3D workstation has five touch-target holograms and secure native actions', async () => {
 const scene = await read('scene-src/worlds.js');
 const actions = await read('src/scene-events.ts');
 const studio = await read('app/diggitstaar.tsx');
 for (const name of ['GMAIL · CONNECT','AI CONTENT STUDIO','VIDEO PRODUCTION','PROJECT WORKLOAD','LEADS & CLIENTS']) assert.ok(scene.includes(name));
 assert.match(scene, /camera\.position\.set\(0,2\.15,6\.7\)/);
 assert.match(scene, /clickable\.push\(g\)/);
 assert.match(actions, /diggitstaar:website/);
 assert.match(studio, /<WorldScene world="diggitstaar"/);
 assert.match(studio, /https:\/\/www\.diggitstaar\.com/);
 assert.match(studio, /Generate script \+ workload/);
});

test('lead register is local, account scoped and requires manual verification', async () => {
 const studio = await read('app/diggitstaar.tsx');
 assert.match(studio, /key \+ ':leads'/);
 assert.match(studio, /AsyncStorage\.setItem\(key \+ ':leads'/);
 assert.match(studio, /Unverified — research required/);
 assert.match(studio, /Mark manually verified/);
 assert.match(studio, /No contacts are invented, automatically researched or emailed/);
});

test('Gmail OAuth uses backend flow and requires verified readback', async () => {
 const studio = await read('app/diggitstaar.tsx');
 const provider = await read('../backend/provider_connections.py');
 assert.match(studio, /api\('\/api\/connections\/gmail\/start/);
 assert.match(studio, /api\('\/api\/connections\/gmail\/finish\//);
 assert.match(studio, /api\('\/api\/connections\/gmail\/inbox/);
 assert.match(provider, /gmail\.readonly/);
 assert.match(provider, /readback_verified/);
 assert.match(provider, /@router\.delete\("\/{provider}"\)/);
});
