import test from 'node:test';
import assert from 'node:assert/strict';
import { decideStartupPlayback } from '../components/staarwardd/startup-audio-gate.ts';

const fresh={sessionReady:true,filmRequested:true,approvedMusicAvailable:true,approvedMusicLoaded:true,approvedMusicFailed:false,muted:false};
test('approved AAC and locked video launch together only when both ready',()=>{
 const r=decideStartupPlayback(fresh);
 assert.equal(r.playFilm,true);
 assert.equal(r.playApprovedMusic,true);
 assert.equal(r.muteFilm,true);
 assert.equal(r.muteMusic,false);
});
test('video is held until approved audio loads',()=>{
 const r=decideStartupPlayback({...fresh,approvedMusicLoaded:false});
 assert.equal(r.waitingForMusic,true);
 assert.equal(r.playFilm,false);
 assert.equal(r.playApprovedMusic,false);
});
test('session not ready does not start media or timer',()=>{
 const r=decideStartupPlayback({...fresh,sessionReady:false});
 assert.equal(r.playFilm,false);
 assert.equal(r.playApprovedMusic,false);
 assert.equal(r.waitingForMusic,false);
});
test('timed-out or errored AAC falls back to original film sound',()=>{
 const r=decideStartupPlayback({...fresh,approvedMusicLoaded:false,approvedMusicFailed:true});
 assert.equal(r.playFilm,true);
 assert.equal(r.playApprovedMusic,false);
 assert.equal(r.muteFilm,false);
 assert.equal(r.fallbackToFilmAudio,true);
});
test('no private AAC in public CI build uses original film sound',()=>{
 const r=decideStartupPlayback({...fresh,approvedMusicAvailable:false,approvedMusicLoaded:false});
 assert.equal(r.playFilm,true);
 assert.equal(r.playApprovedMusic,false);
 assert.equal(r.muteFilm,false);
});
test('mute silences standalone soundtrack and film fallback',()=>{
 const a=decideStartupPlayback({...fresh,muted:true});
 assert.equal(a.muteFilm,true);
 assert.equal(a.muteMusic,true);
 const b=decideStartupPlayback({...fresh,approvedMusicFailed:true,muted:true});
 assert.equal(b.muteFilm,true);
});
test('skip or reduced motion never leaves standalone audio playing',()=>{
 const r=decideStartupPlayback({...fresh,filmRequested:false});
 assert.equal(r.playFilm,false);
 assert.equal(r.playApprovedMusic,false);
 assert.equal(r.waitingForMusic,false);
});
