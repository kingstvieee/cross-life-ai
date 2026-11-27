import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanWorkFocus, createWorkFocusHandoff, workFocusKey } from '../src/work-focus.ts';

test('focus names are bounded and device keys are account scoped', () => {
  assert.equal(cleanWorkFocus('  Fix\n  release\u0000gate  '), 'Fix release gate');
  assert.equal(cleanWorkFocus('x'.repeat(130)).length, 120);
  assert.equal(cleanWorkFocus(null), '');
  assert.notEqual(workFocusKey('a/'), workFocusKey('a_'));
  assert.match(workFocusKey('User:α'), /^[\w.-]+$/);
});

test('Work handoff is one-time, portal-scoped, account-scoped and expires', () => {
  const handoff = createWorkFocusHandoff();
  assert.equal(handoff.stage('owner', 'Portal artwork', 1), true);
  assert.equal(handoff.consume('owner', 'home', 2), null);
  assert.match(handoff.consume('owner', 'work', 3), /"Portal artwork"/);
  assert.equal(handoff.consume('owner', 'work', 4), null);
  handoff.stage('owner', 'Private focus', 100);
  assert.equal(handoff.consume('someone-else', 'work', 101), null);
  assert.equal(handoff.consume('owner', 'work', 101), null);
  handoff.stage('owner', 'Expired', 0);
  assert.equal(handoff.consume('owner', 'work', 60000), null);
});

test('Work stages a review, never puts the title in route parameters or sends it', () => {
  const work = readFileSync(new URL('../app/work-focus.tsx', import.meta.url), 'utf8');
  const chat = readFileSync(new URL('../app/chat.tsx', import.meta.url), 'utf8');
  assert.match(work, /portal: 'work', workFocus: 'review'/);
  assert.match(work, /SecureStore\.setItemAsync\(key, clean\)/);
  assert.match(work, /\/api\/portal\/work\/state.*signal/);
  assert.match(work, /googlegmail:\/\/.*https:\/\/mail\.google\.com\//s);
  assert.doesNotMatch(work, /api\('\/api\/guardian\//);
  assert.match(chat, /workFocusHandoff\.consume\(userKey, portal\)/);
  assert.match(chat, /setInput\(focusText/);
});

test('public portal builds use artwork and never default to debug geometry', () => {
  const env = readFileSync(new URL('../app/environment.tsx', import.meta.url), 'utf8');
  const art = readFileSync(new URL('../components/staarwardd/locked-portal-artwork.ts', import.meta.url), 'utf8');
  const fallback = readFileSync(new URL('../components/staarwardd/diggitstaar-studio-source.ts', import.meta.url), 'utf8');
  assert.match(env, /const debugScene = __DEV__ && preview === 'geometry'/);
  assert.match(env, /if \(world !== 'hub' && !debugScene\)/);
  assert.match(env, /artworkForSignedInPortal\(world, variant, false\)/);
  for (const id of ['home','work','creativity','wellbeing','love','events','style','staarverse','staarsonic','love-singles']) assert.ok(art.includes('/locked/' + id + '.png'), id);
  assert.match(fallback, /number \| null = null/);
  assert.match(env, /button\('Current Work', \(\) => router\.push\('\/work-focus'/);
});
