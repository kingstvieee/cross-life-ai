/** Build 217 playback input transport.
 * Only a host with a separately verified audio timeline should send these frames.
 * A valid packet is not identity, voice-rights, WebAuthn or device certification.
 */
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function applyGuardianSpeechFrame(motion,packet,{session,modelSha256}={}){
 if(!motion?.readyForPlayback || !packet || packet.source!=='staar-native-guardian-audio-v1'||
   packet.session!==session || !sha(modelSha256) ||
   packet.modelSha256!==modelSha256 || !packet.approvedAlignmentEvidenceId ||
   !/^[A-Za-z0-9_-]{8,96}$/.test(packet.approvedAlignmentEvidenceId) ||
   !sha(packet.audioSha256)||!sha(packet.expectedAudioSha256)||
   packet.audioSha256!==packet.expectedAudioSha256) {
   motion?.mute();
   return false;
 }
 return motion.update({
   audioSha256:packet.audioSha256,
   expectedAudioSha256:packet.expectedAudioSha256,
   playheadMs:packet.playheadMs,durationMs:packet.durationMs,
   cues:packet.cues,playing:packet.playing===true,
   approvedAlignment:packet.approvedAlignment===true,
 });
}
