import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const studio = readFileSync(new URL('../app/diggitstaar.tsx', import.meta.url), 'utf8');

test('Gmail direct fallback exists without OAuth, credentials, or hidden inbox access', () => {
  assert.match(studio, /openGmailExternally/);
  assert.match(studio, /Linking\.openURL\('https:\/\/mail\.google\.com\/mail\/'\)/);
  assert.match(studio, /Open Gmail directly · no setup needed/);
  assert.match(studio, /No inbox data is imported into this Studio/);
});
test('optional native read-only Gmail remains gated by provider configuration', () => {
  assert.match(studio, /!gmailConnected && gmailConfigured && button\('Authorize native Gmail read-only access'/);
  assert.match(studio, /gmailConnected && button\('Refresh inbox · read-only'/);
  assert.match(studio, /gmailConnected && button\('Disconnect Gmail'/);
});
test('direct fallback neither exposes account addresses nor requests mail-writing permission', () => {
  assert.doesNotMatch(studio, /staarwardd@gmail\.com|s\.crawford7990@gmail\.com/);
  assert.doesNotMatch(studio, /gmail\.modify|gmail\.send|gmail\.compose/);
});
