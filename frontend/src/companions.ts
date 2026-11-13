import * as Speech from 'expo-speech';

export type CompanionId = 'atlas' | 'kaia';
export const COMPANIONS = [
  { id: 'atlas' as const, name: 'Atlas', desc: 'Calm, assertive and protective. Polished British delivery.', preview: 'I’m Atlas. Let’s bring a little order to your universe. You set the direction; I’ll keep an eye on the details.' },
  { id: 'kaia' as const, name: 'Kaia', desc: 'Warm, soft and assured. Elegant, with a little wit.', preview: 'I’m Kaia. Come in, get comfortable, and let’s make room for what matters to you.' },
];

let speechGeneration = 0;
export async function speakCompanion(text: string, companion: CompanionId, onDone?: () => void) {
  const generation = ++speechGeneration;
  await Speech.stop();
  const voices = await Speech.getAvailableVoicesAsync();
  // Use only a voice actually installed on the device. Never claim that a
  // system fallback is the approved studio voice or infer gender from a name.
  const language = companion === 'atlas' ? 'en-GB' : 'en-US';
  const voice = voices.find(v => v.language === language && v.quality === Speech.VoiceQuality.Enhanced)
    ?? voices.find(v => v.language === language);
  if (generation !== speechGeneration) return;
  Speech.speak(text, { voice: voice?.identifier, language, rate: companion === 'atlas' ? 0.93 : 0.96, pitch: companion === 'atlas' ? 0.9 : 1.04, onDone, onStopped: onDone, onError: onDone });
}

export const stopCompanion = () => { speechGeneration += 1; return Speech.stop(); };
