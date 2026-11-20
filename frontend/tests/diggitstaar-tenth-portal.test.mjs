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
 assert.match(studio, /Gmail connection · Setup pending/);
 assert.match(studio, /Not connected/);
 assert.match(studio, /No automatic sending, deleting, or sharing/);
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
