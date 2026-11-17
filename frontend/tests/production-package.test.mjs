import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { inspectProductionPackage, EXPECTED_APP } from '../scripts/verify-production-package.mjs';

const validApp = buildNumber => ({
  expo: {
    ios: { buildNumber: String(buildNumber), bundleIdentifier: EXPECTED_APP.bundleId, appleTeamId: EXPECTED_APP.appleTeamId },
    owner: EXPECTED_APP.easOwner,
    extra: { eas: { projectId: EXPECTED_APP.easProjectId } }
  }
});
const validEas = { build: { production: { distribution: 'store', ios: { simulator: false } } },
  submit: { production: { ios: { ascAppId: EXPECTED_APP.ascAppId } } } };
const makeFixture = async (buildNumber = 106) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'staar-release-'));
  await writeFile(path.join(dir, 'app.json'), JSON.stringify(validApp(buildNumber)));
  await writeFile(path.join(dir, 'eas.json'), JSON.stringify(validEas));
  return dir;
};

test('release preflight reports missing real art and startup film rather than inventing approvals', async () => {
  const dir = await makeFixture();
  try {
    const result = await inspectProductionPackage(dir);
    assert.equal(result.readyForSignedBuildAttempt, false);
    assert.deepEqual(result.blockers.map(x => x.id).sort(), ['approved-soundtrack','guardian','startup-film','worlds']);
    assert.equal(result.facts.iosBuildNumber, '106');
    assert.match(result.caveat, /Apple signature/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('preflight refuses reusing TestFlight build 105', async () => {
  const dir = await makeFixture(105);
  try {
    const result = await inspectProductionPackage(dir);
    assert.equal(result.readyForSignedBuildAttempt, false);
    assert.ok(result.blockers.some(x => x.id === 'ios-build-number'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('preflight rejects mismatched Apple identity and invalid EAS target', async () => {
  const dir = await makeFixture(106);
  try {
    const app = validApp(106);
    app.expo.ios.bundleIdentifier = 'com.unknown.app';
    await writeFile(path.join(dir, 'app.json'), JSON.stringify(app));
    await writeFile(path.join(dir, 'eas.json'), JSON.stringify({ build: { production: { distribution: 'internal' } } }));
    const result = await inspectProductionPackage(dir);
    assert.ok(result.blockers.some(x => x.id === 'ios-identity'));
    assert.ok(result.blockers.some(x => x.id === 'eas-production'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});


test('Build 211 preflight must include a local private EAS upload-rule verification',async()=>{
 const source=await import('node:fs/promises').then(fs=>fs.readFile(new URL('../scripts/verify-production-package.mjs',import.meta.url),'utf8'));
 assert.match(source,/facts\\.privateEasIncludeRules = await verifyPrivateEasUploadRules/);
 assert.match(source,/fail\\('private-eas-archive-rules'/);
});
