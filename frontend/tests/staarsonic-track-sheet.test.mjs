import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { trackSheetStore, normalizeTrackSheet, formatTrackSheet, EMPTY_TRACK_SHEET } from '../src/staarsonic-track-sheet.ts';

function memory() {
  const values = new Map();
  return {values, get: async key => values.get(key) ?? null, set: async (key, value) => {values.set(key, value);}};
}
test('the actual store reopens only the same account’s session sheet', async () => {
  const storage = memory();
  const stevie = trackSheetStore(storage, 'owner.one');
  const other = trackSheetStore(storage, 'owner:one');
  await stevie.save({ title: 'Toronto Take', bpm: '108', musicalKey: 'F minor', notes: 'Double the hook' });
  assert.deepEqual(await trackSheetStore(storage, 'owner.one').load(), {title:'Toronto Take', bpm:'108', musicalKey:'F minor', notes:'Double the hook'});
  assert.deepEqual(await other.load(), EMPTY_TRACK_SHEET);
  assert.throws(() => trackSheetStore(storage, 'demo_123'));
});
test('invalid or oversized edits do not overwrite a saved track', async () => {
  const store = trackSheetStore(memory(), '123');
  await store.save({title:'Original', bpm:'90'});
  for (const bpm of ['301', '19', '0x80', '120.5']) await assert.rejects(store.save({title:'Bad', bpm}), /BPM/);
  await assert.rejects(store.save({title:'   '}), /Name the track/);
  await assert.rejects(store.save({title:'Big', notes:'é'.repeat(950)}), /too large/);
  assert.equal((await store.load()).title, 'Original');
});
test('a corrupt read stays blocked and unknown fields do not get shared', async () => {
  const storage = memory();
  const store = trackSheetStore(storage, 'owner');
  await store.save({title:'Song'});
  const [key] = storage.values.keys();
  storage.values.set(key, '123');
  await assert.rejects(store.load(), /invalid/);
  assert.equal(formatTrackSheet(normalizeTrackSheet({title:' Song ', bpm:' 97 ', musicalKey:'A major', notes:'Hook', ignored:'PRIVATE'})),
    'Song\nBPM: 97\nKey: A major\n\nSession notes\nHook');
});
test('the locked STAARSONIC portal exposes a native editor only to a real signed-in user', () => {
  const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
  assert.match(read('../app/environment.tsx'), /world === 'staarsonic' && user && !user\.is_demo && button\('Track session sheet'/);
  const screen = read('../app/staarsonic-track-sheet.tsx');
  assert.match(screen, /user && !user\.is_demo/);
  assert.match(screen, /SecureStore\.setItemAsync/);
  assert.match(screen, /Share\.share/);
  assert.doesNotMatch(screen, /\bfetch\(|\bapi\(|requestRecordingPermissions/);
});
