import * as Speech from 'expo-speech';
import { playServerSpeech, stopServerSpeech } from './server-speech';
import { backendUrl } from './backend-config';

export type CompanionId = 'guardian' | 'atlas' | 'kaia';
export const COMPANIONS = [
  { id: 'atlas' as const, name: 'Atlas', desc: 'Calm, assertive and protective. Polished British delivery.', preview: 'I’m Atlas. Let’s bring a little order to your universe. You set the direction; I’ll keep an eye on the details.' },
  { id: 'kaia' as const, name: 'Kaia', desc: 'Warm, soft and assured. Elegant, with a little wit.', preview: 'I’m Kaia. Come in, get comfortable, and let’s make room for what matters to you.' },
];

// Public preview is fixed server narration, never arbitrary guest text.
export async function speakCompanion(_text: string, companion: CompanionId, onDone?: () => void) {
  if (companion === 'guardian') throw new Error('Choose Atlas or Kaia for a voice preview.');
  return playServerSpeech(() => fetch(backendUrl('/api/companion/voice-preview/' + companion)), { onDone });
}
export const stopCompanion = async () => { stopServerSpeech(); await Speech.stop(); };
