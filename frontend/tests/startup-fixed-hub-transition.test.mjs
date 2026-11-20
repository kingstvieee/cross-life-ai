import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
test('homepage is a fixed viewport with centered Guardian and navigable portal hotspots', async () => {
 const hub = await read('components/staarwardd/world-hub.tsx');
 assert.match(hub, /style=\{s\.fullWorld\}/);
 assert.match(hub, /style=\{s\.guardianCenter\}/);
 assert.match(hub, /state=\{guardianArrived \? \(guardianSpeaking \? 'speaking' : 'hover'\) : 'flying'\}/);
 assert.match(hub, /accessibilityLabel=\{`Enter \$\{portal\.label\}`\}/);
 assert.match(hub, /worldPickerOpen &&/);
 assert.doesNotMatch(hub, /<ScrollView[^>]*style=\{s\.scroll\}/);
});
test('startup movie has decoder freeze recovery and the hub crossfades underneath it', async () => {
 const player = await read('components/staarwardd/startup-film-player.tsx');
 const boundary = await read('components/staarwardd/startup-film.tsx');
 assert.match(player, /lastAdvanceAt/);
 assert.match(player, /lastAdvanceAt > 3000/);
 assert.match(player, /playToEnd/);
 assert.match(boundary, /setEntered\(true\)/);
 assert.match(boundary, /duration: reduced \? 0 : 1100/);
 assert.match(boundary, /setTimeout\(finish, 250\)/);
});

test('all five pictured portal names are visibly rendered, with motion-safe glow', async () => {
 const hub = await read('components/staarwardd/world-hub.tsx');
 for (const label of ['STAAR WORK','STAAR DREAMS','STAAR HEALTH','STAAR STYLE','STARVERSE']) assert.ok(hub.includes(label), `Missing ${label}`);
 assert.match(hub, /style=\{s\.portalNamePlate\}/);
 assert.match(hub, /style=\{s\.portalNameText\}/);
 assert.match(hub, /if \(motionReduced \|\| !appActive \|\| worldPickerOpen\)/);
 assert.match(hub, /Animated\.loop/);
});
