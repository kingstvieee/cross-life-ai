import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('portal taps enter the immersive route rather than generic world templates', () => {
  const hub = read('../components/staarwardd/world-hub.tsx');
  const legacy = read('../app/world/[id].tsx');
  assert.match(hub, /pathname: '\/environment', params: \{ world: id \}/);
  assert.match(legacy, /<Redirect href=/);
  assert.doesNotMatch(legacy, /Set up devices & tools|Develop a creative brief|Make something worth sharing/);
});

test('world scene retains tool navigation and discloses preview state', () => {
  const scene = read('../app/environment.tsx');
  assert.match(scene, /WorldScene world=\{world\}/);
  assert.match(scene, /World tools/);
  assert.match(scene, /3D DEVELOPMENT PREVIEW/);
});

test('Cloudflare deployment configuration does not rely on Vercel', () => {
  const config = JSON.parse(read('../../wrangler.jsonc'));
  assert.equal(config.main, 'hosting/guardian-worker.mjs');
  assert.equal(config.assets.binding, 'ASSETS');
  assert.equal(config.assets.not_found_handling, 'single-page-application');
  assert.equal(existsSync(new URL('../../vercel.json', import.meta.url)), false);
});
