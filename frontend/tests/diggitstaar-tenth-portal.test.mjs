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
