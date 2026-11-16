import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflow = readFileSync(path.join(frontend, '.eas/workflows/testflight-release.yml'), 'utf8');
const app = JSON.parse(readFileSync(path.join(frontend, 'app.json'), 'utf8'));

test('EAS build is blocked by verified production package preflight', () => {
  assert.match(workflow, /jobs:\s*\n\s*preflight:/);
  assert.match(workflow, /uses: eas\/checkout/);
  assert.match(workflow, /node scripts\/verify-production-package\.mjs/);
  assert.match(workflow, /build_ios:\s*\n\s*needs: \[preflight\]/);
  assert.match(workflow, /submit_ios:[\s\S]*?needs: \[build_ios\]/);
});

test('TestFlight candidate is unique build 106 and requires an explicit dispatch', () => {
  assert.equal(app.expo.ios.buildNumber, '106');
  assert.match(workflow, /1\.0\.4 \(106\)/);
  assert.match(workflow, /Submit build 106 to TestFlight/);
  assert.doesNotMatch(workflow, /\(105\)|Submit build 105/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\n\s*push:|\n\s*schedule:/);
});
