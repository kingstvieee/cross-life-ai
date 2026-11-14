import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, Text, View } from 'react-native';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { File } from 'expo-file-system';
import { useAuth } from '@/src/auth';
import { stopCompanion } from '@/src/companions';

export function VoiceInput({ onTranscript, disabled, onListening }: { onTranscript: (text: string) => void; disabled: boolean; onListening?: (listening: boolean) => void }) {
  const { api } = useAuth();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const status = useAudioRecorderState(recorder, 250);
  const [phase, setPhase] = useState<'idle' | 'starting' | 'listening' | 'transcribing'>('idle');
  const [notice, setNotice] = useState('');
  useEffect(() => { onListening?.(phase !== 'idle'); }, [phase, onListening]);
  useEffect(() => () => { onListening?.(false); }, [onListening]);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);
  const locked = useRef(false);
  const preparing = useRef(false);
  async function discard() {
    generation.current++; controller.current?.abort();
    if (timer.current) clearTimeout(timer.current);
    try { if (recorder.isRecording) await recorder.stop(); } catch { /* interrupted */ }
    active.current = false; locked.current = false;
    if (Platform.OS !== 'web' && recorder.uri) { try { new File(recorder.uri).delete(); } catch { /* already removed */ } }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
  }
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => { if (state === 'background' || (state === 'inactive' && active.current)) { void discard(); setPhase('idle'); setNotice('Microphone stopped when the app left the foreground.'); } });
    return () => { sub.remove(); void discard(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder]);
  async function finish() {
    if (!active.current) return;
    active.current = false;
    const id = generation.current;
    if (timer.current) clearTimeout(timer.current);
    setPhase('transcribing');
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (id !== generation.current) return;
      const uri = recorder.uri;
      if (!uri) throw new Error('No recording was captured.');
      let encoded: string;
      let mime = 'audio/mp4';
      if (Platform.OS === 'web') {
        const blob = await (await fetch(uri)).blob(); mime = blob.type.split(';')[0] || 'audio/webm';
        encoded = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(blob); });
      } else { encoded = await new File(uri).base64(); }
      if (id !== generation.current) return;
      controller.current = new AbortController();
      const result = await api('/api/companion/transcribe', { method: 'POST', signal: controller.current.signal, body: JSON.stringify({ audio: encoded, mime }) });
      if (!result.ok) throw new Error(result.status === 503 ? 'Voice input is not configured on the server yet.' : 'Could not transcribe. Please try again.');
      const data = await result.json();
      if (id === generation.current) { onTranscript(data.text); setNotice(data.text ? 'Review your words, then press Send.' : 'No words detected. Try again.'); }
    } catch (e) { if (id === generation.current) setNotice(e instanceof Error ? e.message : 'Microphone interrupted.'); }
    finally { if (id === generation.current) { await discard(); setPhase('idle'); } }
  }
  async function start() {
    if (locked.current || preparing.current) return;
    preparing.current = true;
    locked.current = true;
    const id = ++generation.current; setPhase('starting'); setNotice('');
    try {
      await stopCompanion();
      const permission = await requestRecordingPermissionsAsync();
      if (id !== generation.current) return;
      if (!permission.granted) throw new Error('Microphone permission is off. Enable it in device settings to speak.');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (id !== generation.current) { await discard(); return; }
      recorder.record(); active.current = true; setPhase('listening');
      timer.current = setTimeout(() => { void finish(); }, 60000);
    } catch (e) { if (id === generation.current) { await discard(); setPhase('idle'); setNotice(e instanceof Error ? e.message : 'Microphone unavailable.'); } }
    finally { preparing.current = false; }
  }
  return <View style={{ paddingHorizontal: 20, paddingVertical: 8, gap: 8 }}>
    <Text style={{ color: '#AEB5C0', fontSize: 12 }}>Microphone runs only while this screen is listening. Audio is sent for transcription when you stop; review before sending.</Text>
    <View style={{ flexDirection: 'row', gap: 20 }}>
      <Pressable accessibilityRole="button" disabled={disabled || phase === 'starting' || phase === 'transcribing'} onPress={() => { void (phase === 'listening' ? finish() : start()); }}><Text style={{ color: '#F3F4F6', paddingVertical: 10 }}>{phase === 'listening' ? `Stop listening · ${Math.floor(status.durationMillis / 1000)}s` : phase === 'transcribing' ? 'Transcribing…' : phase === 'starting' ? 'Opening microphone…' : 'Speak · up to 60 seconds'}</Text></Pressable>
      {phase !== 'idle' && <Pressable accessibilityRole="button" onPress={() => { void discard(); setPhase('idle'); setNotice('Recording discarded.'); }}><Text style={{ color: '#DDE3EA', paddingVertical: 10 }}>Cancel</Text></Pressable>}
    </View>
    {!!notice && <Text accessibilityRole="alert" style={{ color: '#DDE3EA', fontSize: 12 }}>{notice}</Text>}
  </View>;
}
