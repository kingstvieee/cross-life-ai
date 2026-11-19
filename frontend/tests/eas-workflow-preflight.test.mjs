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
  assert.match(workflow, /founder_acceptance:[\s\S]*?needs: \[build_ios\][\s\S]*?type: require-approval/);
  assert.match(workflow, /submit_ios:[\s\S]*?needs: \[build_ios, founder_acceptance\]/);
});

test('TestFlight workflow is still pinned to old build 109 and cannot silently target current build 109', () => {
  assert.equal(app.expo.ios.buildNumber, '109');
  assert.match(workflow, /1\.0\.4 \(109\)/);
  assert.match(workflow, /Submit build 109 to TestFlight/);
  assert.doesNotMatch(workflow, /\(105\)|Submit build 105/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\n\s*push:|\n\s*schedule:/);
});


test('Build 207 Guardian release gates rerun on mainline changes, without auto-signing or TestFlight submission', () => {
  const guardianWorkflow = readFileSync(path.join(frontend, '../.github/workflows/guardian-release-gates.yml'), 'utf8');
  assert.match(guardianWorkflow, /on:\s*\n\s*push:\s*\n\s*branches:\s*\n\s*- main/);
  assert.match(guardianWorkflow, /pull_request:/);
  assert.match(guardianWorkflow, /tests\/build205-recovered-provenance\.test\.mjs/);
  assert.match(guardianWorkflow, /tests\/approved-guardian-asset\.test\.mjs/);
  assert.doesNotMatch(guardianWorkflow, /eas build|eas submit|type:\s*testflight/);
  assert.match(workflow, /type: require-approval/);
});
