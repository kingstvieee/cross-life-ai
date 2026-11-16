import test from 'node:test';
import assert from 'node:assert/strict';
import { GUARDIAN_VISEMES, validateGuardianVisemeTimeline, mayAnimateApprovedGuardianFace, guardianVisemeAt } from '../src/guardian-visemes.ts';
const sha = 'a'.repeat(64);
const base = { identityAssetId: 'approved-guardian', approvedIdentitySha256: sha, morphTargetNames: GUARDIAN_VISEMES, approved: true };
test('approved identity and full facial morph target mapping required', () => {
  assert.equal(mayAnimateApprovedGuardianFace(base, sha), true);
  assert.equal(mayAnimateApprovedGuardianFace({ ...base, approved: false }, sha), false);
  assert.equal(mayAnimateApprovedGuardianFace({ ...base, approvedIdentitySha256: 'b'.repeat(64) }, sha), false);
  assert.equal(mayAnimateApprovedGuardianFace({ ...base, morphTargetNames: ['rest'] }, sha), false);
  assert.equal(mayAnimateApprovedGuardianFace(null, sha), false);
});
test('reject fabricated, unsorted or invalid phoneme timing data', () => {
  assert.deepEqual(validateGuardianVisemeTimeline([{atMs:50,viseme:'PP',weight:0.8},{atMs:180,viseme:'aa',weight:1}],1000).length,2);
  for(const timeline of [[{atMs:5,viseme:'unapproved',weight:.5}],[{atMs:2,viseme:'PP',weight:.3},{atMs:1,viseme:'FF',weight:.2}],[{atMs:2,viseme:'PP',weight:5}],[{atMs:1500,viseme:'PP',weight:1}]]) {
    assert.throws(()=>validateGuardianVisemeTimeline(timeline,1000));
  }
});
test('mouth returns to neutral before first cue; playback cue lookup is bounded',()=>{
  const cues=validateGuardianVisemeTimeline([{atMs:20,viseme:'PP',weight:.8},{atMs:80,viseme:'rest',weight:0}],1000);
  assert.equal(guardianVisemeAt(cues,-1).viseme,'rest');
  assert.equal(guardianVisemeAt(cues,50).viseme,'PP');
  assert.equal(guardianVisemeAt(cues,90).viseme,'rest');
});
