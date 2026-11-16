import test from 'node:test';
import assert from 'node:assert/strict';
import { GUARDIAN_VISEMES, validateGuardianVisemeTimeline, mayAnimateApprovedGuardianFace, guardianVisemeAt, guardianVisemeForPlayback, parseGuardianAudioAlignment } from '../src/guardian-visemes.ts';
const sha = 'a'.repeat(64);
const base = { identityAssetId: 'approved-guardian', approvedIdentitySha256: sha, morphTargetNames: GUARDIAN_VISEMES, approved: true };
test('audio alignment is bound to verified playback bytes and never grants rig approval', () => {
  const sidecar = {schema:'staar-guardian-alignment-v1', audioSha256:sha,
    source:'rhubarb-audio-mouth-shapes', identityApproved:false, durationMs:1000,
    cues:[{atMs:0,viseme:'PP',weight:1},{atMs:200,viseme:'rest',weight:0}]};
  assert.equal(parseGuardianAudioAlignment(sidecar,sha).cues.length,2);
  assert.throws(()=>parseGuardianAudioAlignment(sidecar,'b'.repeat(64)));
  assert.throws(()=>parseGuardianAudioAlignment({...sidecar,identityApproved:true},sha));
  assert.throws(()=>parseGuardianAudioAlignment({...sidecar,cues:[{atMs:2000,viseme:'aa',weight:1}]},sha));
});
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

test('paused, finished or unapproved Guardian facial rig returns a neutral mouth',()=>{
 const cues=validateGuardianVisemeTimeline([{atMs:100,viseme:'aa',weight:1}],1000);
 assert.equal(guardianVisemeForPlayback(cues,200,1000,true,true).viseme,'aa');
 for(const args of [
   [200,1000,false,true],[200,1000,true,false],[1000,1000,true,true],
   [200,0,true,true],[-1,1000,true,true],[Infinity,1000,true,true]
 ]) assert.deepEqual(guardianVisemeForPlayback(cues,...args),{atMs:0,viseme:'rest',weight:0});
});
