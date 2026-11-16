import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(readFileSync(path.join(root,'scene-src/build193-recovered-media.json'),'utf8'));
const isSha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
test('recovered user-approved song has separate untampered original and iOS-compatible derivative hashes',()=>{
 assert.equal(data.schema,'staar-build193-recovered-media-v1');
 assert.equal(data.soundtrack.originalFilename,'Starward Guardian(2).m4a');
 assert.equal(data.soundtrack.originalCodec,'opus');
 assert.equal(data.soundtrack.iosCodec,'aac');
 assert.equal(data.soundtrack.iosChannels,2);
 assert.equal(data.soundtrack.iosSampleRate,48000);
 assert.equal(data.soundtrack.originalDurationSeconds,206);
 assert.ok(isSha(data.soundtrack.originalSha256)&&isSha(data.soundtrack.iosStagingSha256));
 assert.notEqual(data.soundtrack.originalSha256,data.soundtrack.iosStagingSha256);
 assert.equal(data.soundtrack.originalMasterPreserved,true);
});
test('real library video frames are source-bound and no synthetic scan claims are inferred',()=>{
 assert.equal(data.referenceVideos.length,2);
 assert.equal(data.frameCandidates.length,5);
 assert.equal(new Set(data.frameCandidates.map(x=>x.sha256)).size,5);
 assert.ok(data.referenceVideos.every(x=>isSha(x.sha256)&&x.actual3DScan===false));
 assert.ok(data.frameCandidates.every(x=>isSha(x.sha256)&&x.productionLikenessApproved===false));
 assert.equal(data.realProfileCalibrationAvailable,false);
});
test('production remains fail-closed until binaries and human/device approval exist',()=>{
 for(const key of ['binaryStoredInGitRepository','nativePlaybackDeviceVerified','appRuntimeIntegrated','licenseEvidenceVerified'])
  assert.equal(data.soundtrack[key],false);
 for(const key of ['approved3DRigAvailable','approvedCinematicWorldsAvailable','deviceAudioAndFaceQA','finalProductionRelease'])
  assert.equal(data[key],false);
 assert.equal(data.soundtrack.explicitCashSpendCAD,0);
 const preflight=readFileSync(path.join(root,'scripts/verify-production-package.mjs'),'utf8');
 assert.doesNotMatch(preflight,/build193-recovered-media/);
});
