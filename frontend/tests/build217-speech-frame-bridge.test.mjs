import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createApprovedGuardianFaceMotion,FACE_TARGETS} from '../scene-src/guardian-face-motion.js';
import {applyGuardianSpeechFrame} from '../scene-src/guardian-speech-bridge.js';
import {guardianWireFrame} from '../src/guardian-audio-frame.ts';

const H='a'.repeat(64),A='b'.repeat(64),SESSION='session_XYZ1298';
function fixture(){
 const influences=Array(16).fill(0);
 const root={traverse(cb){cb({morphTargetDictionary:
   Object.fromEntries(FACE_TARGETS.map((v,i)=>[v,i])),morphTargetInfluences:influences});}};
 return {motion:createApprovedGuardianFaceMotion(root,
    {rigSha256:H,expectedRigSha256:H}),influences};
}
const good={
  source:'staar-native-guardian-audio-v1',session:SESSION,modelSha256:H,
  audioSha256:A,expectedAudioSha256:A,approvedAlignmentEvidenceId:'verified_clip_1234',
  approvedAlignment:true,playing:true,playheadMs:180,durationMs:1000,
  cues:[{atMs:100,viseme:'PP',weight:.9},{atMs:500,viseme:'FF',weight:.5}],
};
test('Build 217 verified host clip packet drives exact approved 16-viseme GLB',()=>{
 const {motion,influences}=fixture();
 assert.equal(applyGuardianSpeechFrame(motion,good,{session:SESSION,modelSha256:H}),true);
 assert.equal(influences[FACE_TARGETS.indexOf('PP')],.9);
 assert.equal(applyGuardianSpeechFrame(motion,{...good,playheadMs:600},
   {session:SESSION,modelSha256:H}),true);
 assert.equal(influences[FACE_TARGETS.indexOf('FF')],.5);
 motion.dispose();
});
test('Build 217 bad clip, fake model, stale session, muted playback or no actual cues resets mouth',()=>{
 const {motion,influences}=fixture();
 for(const patch of [
   {session:'other'}, {modelSha256:'c'.repeat(64)},
   {audioSha256:'c'.repeat(64)},{approvedAlignment:false},
   {approvedAlignmentEvidenceId:''},{playing:false},
   {cues:[{atMs:100,viseme:'unknown',weight:1}]}
 ]){
   applyGuardianSpeechFrame(motion,good,{session:SESSION,modelSha256:H});
   assert.equal(applyGuardianSpeechFrame(motion,{...good,...patch},
     {session:SESSION,modelSha256:H}),false);
   assert.ok(influences.every(v=>v===0));
 }
 assert.equal(applyGuardianSpeechFrame(null,good,
   {session:SESSION,modelSha256:H}),false);
});
test('Build 217 scene connects real cue packets; never fabricates a model or a speech timeline',()=>{
 const source=readFileSync(new URL('../scene-src/worlds.js',import.meta.url),'utf8');
 assert.match(source,/window\.addEventListener\('message',onHostFaceFrame\)/);
 assert.match(source,/applyGuardianSpeechFrame\(guardianFaceMotion,packet/);
 assert.match(source,/window\.removeEventListener\('message',onHostFaceFrame\)/);
 assert.match(source,/guardianFaceMotion\.mute\(\)/);
});

test('Build 217 web and native hosts forward only account-audible scene packets',()=>{
 const native=readFileSync(new URL('../components/staarwardd/world-scene.tsx',import.meta.url),'utf8');
 const web=readFileSync(new URL('../components/staarwardd/world-scene.web.tsx',import.meta.url),'utf8');
 for(const source of [native,web]){
   assert.match(source,/guardianWireFrame\(allowed\?guardianAudioFrame:null,session\)/);
   assert.match(source,/audio\.voicePlaybackActive/);
   assert.match(source,/audio\.speechQuiet/);
   assert.match(source,/onLoad/);
 }
 assert.match(native,/webviewRef\.current\?\.injectJavaScript/);
 assert.match(web,/iframe\.current\?\.contentWindow\?\.postMessage/);
 const reset=guardianWireFrame(null,SESSION);
 assert.equal(reset.playing,false);
 assert.equal(reset.session,SESSION);
 const sent=guardianWireFrame(good,SESSION);
 assert.equal(sent.source,'staar-native-guardian-audio-v1');
 assert.equal(sent.audioSha256,A);
});
