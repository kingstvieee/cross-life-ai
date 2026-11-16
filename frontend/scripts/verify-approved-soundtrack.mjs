import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
export const LOCKED_GUARDIAN_MUSIC=Object.freeze({
 sourceFilename:'Starward Guardian(2).m4a',
 sourceSha256:'2b8590fcae07a81e96fad7f6cb4769b02ef6eb0856ee9831ee0eb68c0e1a9938',
 filename:'Starward_Guardian_Approved_AAC_iOS.m4a',
 sha256:'ddd63b3622dd7524af8d976d53d7c0afce7cd35a4af1f7c3ce88ba61afadb937',
 bytes:6743732, codec:'aac',sampleRate:48000,channels:2,
});
/** Validates the actual on-disk AAC derivative; does not attest live iPhone playback.
 * Binary is stored in the owner's private staging package until deployment approval.
 */
export async function verifyApprovedSoundtrack(frontendRoot,expected=LOCKED_GUARDIAN_MUSIC){
 const file=path.join(frontendRoot,'assets','audio',expected.filename);
 const data=await readFile(file);
 if(data.length!==expected.bytes)throw Error('approved_audio_size_mismatch');
 if(data.length<32 || data.toString('ascii',4,8)!=='ftyp')
   throw Error('approved_audio_invalid_mp4_container');
 const actual=createHash('sha256').update(data).digest('hex');
 if(actual!==expected.sha256)throw Error('approved_audio_hash_mismatch');
 return {sha256:actual,bytes:data.length,codecExpected:expected.codec,
  sourceSha256:expected.sourceSha256,
  caveat:'MP4 structure and hash only; codec/playback must be verified independently on device'};
}
