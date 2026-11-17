import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {guardianFrameFromPlayback,guardianWireFrame} from '../src/guardian-audio-frame.ts';
const audio='b'.repeat(64),model='c'.repeat(64);
const bound={modelSha256:model,alignment:{source:'rhubarb-audio-mouth-shapes',
 durationMs:1200,cues:[{atMs:0,viseme:'rest',weight:0},{atMs:100,viseme:'PP',weight:1},{atMs:350,viseme:'rest',weight:0}]}};
const base={currentTime:.20,duration:1.2,playing:true,isBuffering:false,didJustFinish:false,error:null};
test('Build 217 real Expo playback seconds become hash-bound measured facial milliseconds',()=>{
 const frame=guardianFrameFromPlayback({audioSha256:audio},bound,base);
 assert.ok(frame);
 assert.equal(frame.playheadMs,200);
 assert.equal(frame.durationMs,1200);
 assert.equal(frame.modelSha256,model);
 assert.equal(frame.audioSha256,audio);
 assert.equal(frame.approvedAlignmentEvidenceId,'rhubarb_'+audio.slice(0,32));
 const packet=guardianWireFrame(frame,'session_1');
 assert.equal(packet.source,'staar-native-guardian-audio-v1');
 assert.equal(packet.session,'session_1');
});
test('Build 217 silence when no final GLB, no verified cues, clock drift, muted or corrupt audio',()=>{
 const overrides=[
  [null,base],[bound,{...base,playing:false}],
  [bound,{...base,isBuffering:true}],
  [bound,{...base,didJustFinish:true}],
  [bound,{...base,duration:9}],
  [bound,{...base,currentTime:Infinity}],
  [bound,{...base,currentTime:2}],
  [{...bound,modelSha256:'bad'},base],
  [{...bound,alignment:{...bound.alignment,cues:[]}},base],
  [{...bound,alignment:{...bound.alignment,source:'unverified'}},base],
 ];
 for(const [current,status] of overrides)
   assert.equal(guardianFrameFromPlayback({audioSha256:audio},current,status),null);
 assert.equal(guardianFrameFromPlayback({audioSha256:'bad'},bound,base),null);
 const muted=guardianWireFrame(null,'session_1');
 assert.equal(muted.playing,false);
 assert.equal(muted.approvedAlignment,false);
});
test('Build 217 actual account-bound alignment used before playback; no synthetic phonemes',()=>{
 const player=readFileSync(new URL('../src/server-speech.ts',import.meta.url),'utf8');
 const provider=readFileSync(new URL('../lib/staarwardd/audio-provider.tsx',import.meta.url),'utf8');
 const scene=readFileSync(new URL('../scene-src/worlds.js',import.meta.url),'utf8');
 for(const marker of ['guardianFrameFromPlayback(clip,bound,status)','updateInterval: 100',
   'options.resolveAlignment?.(clip, controller.signal)'])
   assert.ok(player.includes(marker),marker);
 assert.ok(provider.includes('fetchGuardianAlignmentForClip(clip,api'));
 assert.ok(provider.includes('guardianRigShaRef.current'));
 assert.ok(provider.includes('setGuardianAudioFrame(null)'));
 assert.ok(scene.includes("report('guardian-face-ready',{modelSha256:asset.rigModelSha256})"));
 assert.ok(!scene.includes('const fabricatedCues='));
});
