import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL('../'+path, import.meta.url), 'utf8');

test('all nine embedded portal doors are visible without cropping the locked image',async()=>{
 const hub=await read('components/staarwardd/world-hub.tsx');
 assert.match(hub,/locked\/homepage\.png/);
 assert.match(hub,/aspectRatio: 1672 \/ 941/);
 assert.match(hub,/resizeMode="contain" style=\{s\.sceneArt\}/);
 assert.match(hub,/style=\{s\.portalScene\}/);
 const map=hub.slice(hub.indexOf('const hotspots ='),hub.indexOf('return <View style={s.root}>'));
 for(const id of ['home','work','creativity','wellbeing','relationships','events','style','staarverse','staarsonic']) assert.ok(map.includes("id: '"+id+"'"),id);
 assert.equal((map.match(/id: '/g)||[]).length,9);
 assert.match(hub,/EXPLORE ALL 9 PORTALS/);
 assert.match(hub,/worldPickerOpen &&/);
 assert.doesNotMatch(hub,/resizeMode="cover" style=\{s\.sceneArt\}/);
 assert.doesNotMatch(hub,/style=\{s\.portalNamePlate\}/);
});
test('locked native film survives frozen decoder, crossfades to pre-mounted app',async()=>{
 const player=await read('components/staarwardd/startup-film-player.tsx');
 const boundary=await read('components/staarwardd/startup-film.tsx');
 assert.match(player,/guardian-startup\.mp4/);
 assert.match(player,/lastAdvanceAt > 3000/);
 assert.match(player,/current >= player\.duration - 3/);
 assert.match(player,/lastAdvanceAt > 1700/);
 assert.match(player,/playToEnd/);
 assert.match(boundary,/styles\.appLayer/);
 assert.match(boundary,/importantForAccessibility=\{visible \? "no-hide-descendants"/);
 assert.match(boundary,/duration: reduced \? 0 : 1100/);
 assert.match(boundary,/setTimeout\(finish, 250\)/);
 assert.doesNotMatch(boundary,/entered \? children : null/);
});
test('do not launch a mismatched post-film Guardian video',async()=>{
 const hub=await read('components/staarwardd/world-hub.tsx');
 assert.doesNotMatch(hub,/<GuardianCharacter/);
 assert.doesNotMatch(hub,/state=\{'flying'\}/);
 assert.match(hub,/GUARDIAN ONLINE · NINE WORLDS AWAIT/);
});
test('mobile wordmark is measured and shrinkable',async()=>{
 const boundary=await read('components/staarwardd/startup-film.tsx');
 const hub=await read('components/staarwardd/world-hub.tsx');
 assert.match(boundary,/brandCompact/);
 assert.match(boundary,/adjustsFontSizeToFit/);
 assert.match(hub,/brandPhone/);
 assert.match(hub,/numberOfLines=\{1\}>STAARWAARDD/);
});
