/**
 * Build 181 — deterministic, read-only candidate package preflight.
 * Passing this script is necessary but not sufficient for App Store release:
 * it cannot verify human visual acceptance, Apple signing or physical devices.
 */
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadApprovedArmoredGuardianAsset } from '../scene-src/approved-guardian-asset.mjs';
import { loadApprovedWorldAssets, REQUIRED_WORLD_ASSETS } from '../scene-src/approved-world-assets.mjs';
import { verifyReleaseEvidence } from './verify-release-evidence.mjs';
import { verifyApprovedSoundtrack } from './verify-approved-soundtrack.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const FRONTEND_ROOT = path.resolve(HERE, '..');
export const LOCKED_STARTUP_SHA = '1c8dce7f7b5f18e9ae580ec14910a0e20939cb8b52ec43897a08d2ecaa98886c';
export const EXPECTED_APP = Object.freeze({
  bundleId: 'com.emergent.crosslifeai.z79271',
  appleTeamId: 'R9BPDSU4BW',
  easOwner: 'staarwarddceos-team',
  easProjectId: 'd3485a8e-6746-4383-999e-0907fc4d86a7',
  ascAppId: '6834467523'
});

export async function inspectProductionPackage(root = FRONTEND_ROOT, lastTestFlightBuild = 105) {
  const blockers = [];
  const facts = {};
  let approvedGuardian = null;
  let approvedWorlds = null;
  const fail = (id, reason) => blockers.push({ id, reason: String(reason) });
  const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), 'utf8'));

  try {
    const approved = await loadApprovedArmoredGuardianAsset(path.join(root, 'scene-src'));
    if (!approved) fail('guardian', 'The identity-approved skinned Guardian GLB and signed-off receipt are absent');
    else { approvedGuardian = approved; facts.guardianModelSha256 = approved.rigModelSha256; }
  } catch (err) { fail('guardian', err?.message ?? err); }

  try {
    const worlds = await loadApprovedWorldAssets(path.join(root, 'scene-src'));
    if (!worlds) fail('worlds', 'The ten individually approved, evidence-paired world GLBs are absent');
    else {
      const keys = Object.keys(worlds).sort();
      if (keys.length !== REQUIRED_WORLD_ASSETS.length ||
          REQUIRED_WORLD_ASSETS.some(key => !keys.includes(key))) {
        fail('worlds', 'Missing required world variants');
      } else {
        approvedWorlds = worlds;
        facts.worldVariantCount = keys.length;
      }
    }
  } catch (err) { fail('worlds', err?.message ?? err); }

  // JSON acceptance booleans are insufficient. Re-verify real independent
  // model-specific visual, rights and physical-device evidence by file hash.
  if (approvedGuardian && approvedWorlds) {
    try {
      facts.externalEvidence = await verifyReleaseEvidence(root, approvedGuardian, approvedWorlds);
    } catch (err) { fail('independent-evidence', err?.message ?? err); }
  }

  try {
    facts.approvedAudio = await verifyApprovedSoundtrack(root);
  } catch (err) { fail('approved-soundtrack', err?.message ?? err); }

  try {
    const bytes = await readFile(path.join(root, 'assets/videos/guardian-startup.mp4'));
    const sha = createHash('sha256').update(bytes).digest('hex');
    facts.startupFilmSha256 = sha;
    if (sha !== LOCKED_STARTUP_SHA) fail('startup-film', 'Locked startup film hash does not match');
  } catch (err) { fail('startup-film', err?.message ?? err); }

  try {
    const config = await readJson('app.json');
    const expo = config?.expo ?? {};
    const ios = expo.ios ?? {};
    const build = Number(ios.buildNumber);
    facts.iosBuildNumber = ios.buildNumber;
    if (!Number.isSafeInteger(build) || build <= lastTestFlightBuild)
      fail('ios-build-number', 'Candidate iOS build number must exceed the current TestFlight build');
    if (ios.bundleIdentifier !== EXPECTED_APP.bundleId || ios.appleTeamId !== EXPECTED_APP.appleTeamId)
      fail('ios-identity', 'Apple app identity differs from the locked target');
    if (expo.owner !== EXPECTED_APP.easOwner ||
        expo.extra?.eas?.projectId !== EXPECTED_APP.easProjectId)
      fail('expo-project', 'EAS owner/project differs from locked configuration');
  } catch (err) { fail('app-config', err?.message ?? err); }

  try {
    const eas = await readJson('eas.json');
    if (eas?.build?.production?.distribution !== 'store' ||
        eas?.build?.production?.ios?.simulator !== false ||
        String(eas?.submit?.production?.ios?.ascAppId) !== EXPECTED_APP.ascAppId)
      fail('eas-production', 'Store distribution or App Store Connect linkage differs from approved configuration');
  } catch (err) { fail('eas-config', err?.message ?? err); }

  return {
    schema: 'staarwardd-production-package-preflight-v1',
    readyForSignedBuildAttempt: blockers.length === 0,
    blockers, facts,
    caveat: 'Even a successful preflight does not attest founder artwork approval, Apple signature, live OAuth, physical iPhone/Watch testing or TestFlight acceptance.'
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await inspectProductionPackage();
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (!result.readyForSignedBuildAttempt) process.exitCode = 1;
}
