import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflow = readFileSync(path.join(frontend, '.eas/workflows/testflight-release.yml'), 'utf8');
const app = JSON.parse(readFileSync(path.join(frontend, 'app.json'), 'utf8'));
const eas = JSON.parse(readFileSync(path.join(frontend, 'eas.json'), 'utf8'));

test('EAS build is blocked by verified production package preflight', () => {
  assert.match(workflow, /jobs:\s*\n\s*preflight:/);
  assert.match(workflow, /uses: eas\/checkout/);
  assert.match(workflow, /node scripts\/verify-production-package\.mjs/);
  assert.match(workflow, /build_ios:\s*\n\s*needs: \[preflight\]/);
  assert.match(workflow, /founder_acceptance:[\s\S]*?needs: \[build_ios\][\s\S]*?type: require-approval/);
  assert.match(workflow, /submit_ios:[\s\S]*?needs: \[build_ios, founder_acceptance\]/);
});

test('TestFlight candidate 116 follows verified Expo Codemagic issued 115 and requires explicit dispatch', () => {
  assert.equal(app.expo.ios.buildNumber, '116');
  assert.match(workflow, /1\.0\.4 \(116\)/);
  assert.match(workflow, /Submit build 116 to TestFlight/);
  assert.doesNotMatch(workflow, /\(105\)|Submit build 105|\(106\)|\(107\)|\(108\)/);
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

test('internal native builds use verified Render preview while production stays isolated', () => {
  const renderPreview = 'https://staarwardd-guardian-preview.onrender.com';
  assert.equal(eas.build.preview.env.EXPO_PUBLIC_BACKEND_URL, renderPreview);
  assert.equal(eas.build.development.env.EXPO_PUBLIC_BACKEND_URL, renderPreview);
  assert.equal(eas.build.preview.env.STAAR_IPHONE_ONLY_QA, '1');
  assert.equal(eas.build.production.env.EXPO_PUBLIC_GUARDIAN_DEVICE_QA, '0');
  assert.notEqual(eas.build.production.env.EXPO_PUBLIC_BACKEND_URL, renderPreview);
  assert.equal(app.expo.scheme, 'frontend');
  const renderBlueprint = readFileSync(path.join(frontend, '../render.yaml'), 'utf8');
  assert.match(renderBlueprint, /healthCheckPath: \/api\/health\/ready/);
  assert.match(renderBlueprint, /AUTH_NATIVE_REDIRECT_URL\s*\n\s*value: frontend:\/\/auth-complete/);
});

test('Render preview declares Auth0 integration with a server-only secret and no Microsoft enablement', () => {
  const blueprint = readFileSync(path.join(frontend, '../render.yaml'), 'utf8');
  assert.ok(blueprint.includes('AUTH_ISSUER'));
  assert.ok(blueprint.includes('https://staarwaardd-hub.ca.auth0.com/'));
  assert.ok(blueprint.includes('AUTH_CLIENT_SECRET'));
  assert.ok(blueprint.includes('sync: false'));
  assert.ok(blueprint.includes('AUTH_CONNECTION_GOOGLE'));
  assert.ok(blueprint.includes('value: google-oauth2'));
  assert.ok(blueprint.includes('AUTH_CONNECTION_EMAIL'));
  assert.ok(blueprint.includes('value: Username-Password-Authentication'));
  assert.ok(!blueprint.includes('AUTH_CONNECTION_MICROSOFT'));
  assert.ok(blueprint.includes('autoDeployTrigger: off'));
});
