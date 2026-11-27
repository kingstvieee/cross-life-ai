import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeCampaign, campaignExport, EMPTY_CAMPAIGN } from '../src/diggit-campaign.ts';

test('DIGGITSTAAR drafts restore only supported fields and stages', () => {
  assert.deepEqual(normalizeCampaign(null), EMPTY_CAMPAIGN);
  const draft = normalizeCampaign({ title: '  Toronto launch  ', stage: 'unknown', audience: 'a'.repeat(300), script: 7, token: 'ignore' });
  assert.equal(draft.title, 'Toronto launch');
  assert.equal(draft.stage, 'planning');
  assert.equal(draft.audience.length, 140);
  assert.equal(draft.script, '');
  assert.equal('token' in draft, false);
});

test('campaign exports contain selected content and never claim publication', () => {
  assert.equal(campaignExport(EMPTY_CAMPAIGN), null);
  assert.equal(campaignExport({...EMPTY_CAMPAIGN, title: 'Pilot', stage: 'review', deliverable: 'Short', script: 'Opening line'}),
    'Pilot\nStage: review\nDeliverable: Short\n\nScript\nOpening line');
});

test('the campaign action opens an authenticated local editor with deliberate native sharing', () => {
  const read = file => readFileSync(new URL(file, import.meta.url),'utf8');
  const editor = read('../app/diggit-campaign.tsx');
  assert.match(read('../app/environment.tsx'), /button\('Campaign editor', \(\) => router\.push\('\/diggit-campaign'/);
  assert.match(editor, /user && !user\.is_demo/);
  assert.match(editor, /SecureStore\.setItemAsync\(key, serialized\)/);
  assert.match(editor, /Share\.share\(\{ message, title: 'DIGGITSTAAR campaign' \}\)/);
  assert.doesNotMatch(editor, /\bfetch\(|\bapi\(/);
});

test('the signed internal workflow refuses to archive without an authorized exact studio master', () => {
  const workflow = readFileSync(new URL('../../codemagic.yaml', import.meta.url), 'utf8');
  const lane = workflow.slice(workflow.indexOf('  staar-home-reconciliation-preflight:'));
  const stage = lane.indexOf('stage-diggitstaar-internal-artwork.mjs');
  assert.ok(stage > 0 && stage < lane.indexOf('Archive signed internal-only TestFlight IPA'));
  assert.match(lane, /STAAR_PRIVATE_PORTAL_ARTWORK_AUTHORIZED/);
  assert.match(lane, /STAAR_DIGGITSTAAR_MASTER_PATH/);
  assert.match(lane, /BLOCKED: exact owner-authorized DIGGITSTAAR master missing/);
});
