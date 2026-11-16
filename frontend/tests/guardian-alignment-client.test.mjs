import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGuardianSpeechClip } from '../src/guardian-speech-clip.ts';
import { fetchGuardianAlignmentForClip } from '../src/guardian-alignment-client.ts';
const sha='a'.repeat(64);
const clip=parseGuardianSpeechClip({url:'/api/tts/clip.private-1.mp3',audioSha256:sha,text:'not retained'});
const record={schema:'staar-guardian-alignment-v1',audioSha256:sha,source:'rhubarb-audio-mouth-shapes',identityApproved:false,durationMs:1000,cues:[{atMs:0,viseme:'rest',weight:0},{atMs:50,viseme:'PP',weight:1},{atMs:150,viseme:'rest',weight:0}]};
test('clip descriptor requires a fixed TTS path and exact 64-character audio hash',()=>{
 assert.equal(clip.key,'clip.private-1');
 assert.throws(()=>parseGuardianSpeechClip({url:'https://evil.example/speech',audioSha256:sha}));
 assert.throws(()=>parseGuardianSpeechClip({url:'/api/tts/../clip.mp3',audioSha256:sha}));
 assert.throws(()=>parseGuardianSpeechClip({url:clip.url,audioSha256:'invalid'}));
});
test('no unapproved Guardian rig means no alignment request or paid voice work',async()=>{
 let calls=0;
 const request=async()=>{calls++;return new Response('{}');};
 assert.equal(await fetchGuardianAlignmentForClip(clip,request,{approvedRigReady:false}),null);
 assert.equal(calls,0);
});
test('authorized alignment is bound to exact clip hash and requires valid cues',async()=>{
 let path='',method='';
 const api=async(p,opts)=>{path=p;method=opts.method;return Response.json(record)};
 const result=await fetchGuardianAlignmentForClip(clip,api,{approvedRigReady:true});
 assert.equal(path,'/api/guardian/speech-alignment/clip.private-1');
 assert.equal(method,'POST');
 assert.equal(result.cues[1].viseme,'PP');
 await assert.rejects(fetchGuardianAlignmentForClip(clip,async()=>Response.json({...record,audioSha256:'b'.repeat(64)}),{approvedRigReady:true}),/audio_alignment_mismatch/);
 await assert.rejects(fetchGuardianAlignmentForClip(clip,async()=>Response.json({...record,identityApproved:true}),{approvedRigReady:true}),/audio_alignment_mismatch/);
});
test('expired or cancelled account-bound alignment fails without changing face',async()=>{
 await assert.rejects(fetchGuardianAlignmentForClip(clip,async()=>Response.json({detail:'speech_expired'},{status:410}),{approvedRigReady:true}),/guardian_alignment_unavailable/);
 const controller=new AbortController();
 await assert.rejects(fetchGuardianAlignmentForClip(clip,async()=>{controller.abort();return Response.json(record)},{approvedRigReady:true,signal:controller.signal}),/guardian_alignment_cancelled/);
});
