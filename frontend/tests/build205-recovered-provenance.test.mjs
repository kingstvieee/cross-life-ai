import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../scene-src');
const read=name=>JSON.parse(readFileSync(path.join(root,name),'utf8'));
const recovered=read('build205-recovered-3d-provenance.json');
const original=read('build198-cinematic-review-register.json');

test('recovered eleven actual GLB fingerprints agree with existing private Build 198 provenance',()=>{
  assert.equal(recovered.schema,'staar-build205-recovered-embedded-model-provenance-v1');
  assert.equal(recovered.modelHashesMatchedExistingBuild198Register,true);
  assert.match(recovered.source.sourceHtmlSha256,/^[a-f0-9]{64}$/);
  assert.match(recovered.privateRecovery.archiveSha256,/^[a-f0-9]{64}$/);
  assert.equal(recovered.privateRecovery.archiveUploadedToPublicRepo,false);
  assert.equal(recovered.recoveredAssetCount,11);
  assert.equal(original.worldAssets.length,recovered.worlds.modelCount);
  assert.equal(original.guardian.sha256,recovered.guardian.modelSha256);
  assert.equal(new Set(original.worldAssets.map(x=>x.sha256)).size,10);
});
test('recovered old facial mesh may not bypass improved Build 204 morph and owner likeness gates',()=>{
  assert.equal(recovered.guardian.skinCount,1);
  assert.equal(recovered.guardian.morphNames.length,16);
  assert.deepEqual(recovered.guardian.morphNames,original.guardian.namedMorphTargets);
  assert.equal(recovered.guardian.faceVertexCount,10285);
  assert.ok(recovered.guardian.measuredMaxAbsSpeechMorphCosineApprox>=0.9999);
  assert.equal(recovered.guardian.distinctSpeechMorphGatePassed,false);
  assert.equal(recovered.guardian.finalRealLikenessAccepted,false);
  assert.equal(recovered.guardian.productionRigActivationAllowed,false);
  assert.equal(original.guardian.founderFinalModelApproved,false);
});
test('recovering valid archived bytes is NOT rights, visual, collision or Apple release acceptance',()=>{
  assert.equal(recovered.worlds.allHashesMatched,true);
  for(const k of ['finalVisualApproved','rightsEvidenceAccepted','inAppNavmeshPhysicsCertified','physicalDeviceVerified'])
    assert.equal(recovered.worlds[k],false);
  assert.equal(recovered.externalDirectSpendCAD,0);
  assert.match(recovered.releaseVerdict,/NO-GO/);
});
