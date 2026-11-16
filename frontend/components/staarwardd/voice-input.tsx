import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, Text, View } from 'react-native';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { File } from 'expo-file-system';
import { useAuth } from '@/src/auth';
import { stopCompanion } from '@/src/companions';
import { useStaarAudio } from '@/lib/staarwardd/audio-provider';

export function VoiceInput({ onTranscript, disabled, onListening }: { onTranscript: (text: string) => void; disabled: boolean; onListening?: (listening: boolean) => void }) {
  const { api, user } = useAuth();
  const account = user && !user.is_demo ? user.user_id : null;
  const accountRef = useRef(account);
  accountRef.current = account;
  const previousAccount = useRef(account);
  const capturedAccount = useRef<string | null>(null);
  const audio = useStaarAudio();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const status = useAudioRecorderState(recorder, 250);
  const [phase, setPhase] = useState<'idle' | 'starting' | 'listening' | 'transcribing'>('idle');
  const [notice, setNotice] = useState('');
  const [sessionEnabled, setSessionEnabled] = useState(true);
  const sessionEnabledRef = useRef(true);
  const foregroundRef = useRef(AppState.currentState === 'active');
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  useEffect(() => { onListening?.(phase !== 'idle'); }, [phase, onListening]);
  useEffect(() => () => { onListening?.(false); }, [onListening]);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);
  const locked = useRef(false);
  const preparing = useRef(false);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  async function discard() {
    generation.current++; controller.current?.abort();
    controller.current = null;
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    try { if (recorder.isRecording) await recorder.stop(); } catch { /* interrupted */ }
    active.current = false; locked.current = false;
    if (Platform.OS !== 'web' && recorder.uri) { try { new File(recorder.uri).delete(); } catch { /* already removed */ } }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
  }
  useEffect(() => {
    if (previousAccount.current === account) return;
    previousAccount.current = account;
    void discard(); setPhase('idle'); setNotice('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);
  useEffect(() => {
    if ((disabled || !sessionEnabled) && (active.current || preparing.current || phase === 'transcribing')) {
      void discard(); setPhase('idle'); setNotice('Microphone stopped while Guardian was processing another action.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, sessionEnabled]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      foregroundRef.current = state === 'active';
      if (state !== 'active' && (active.current || preparing.current || phaseRef.current === 'transcribing')) {
        void discard(); setPhase('idle'); setNotice('Microphone stopped when the app left the foreground.');
      }
    });
    return () => { sub.remove(); void discard(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder]);
  async function finish() {
    if (!active.current) return;
    active.current = false;
    const id = generation.current;
    const recordingAccount = capturedAccount.current;
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
      // Never upload a recording after the session was disabled, backgrounded or cancelled.
      if (id !== generation.current || !recordingAccount || recordingAccount !== accountRef.current || disabledRef.current || !sessionEnabledRef.current || !foregroundRef.current) return;
      controller.current = new AbortController();
      const result = await api('/api/companion/transcribe', { method: 'POST', signal: controller.current.signal, body: JSON.stringify({ audio: encoded, mime }) });
      if (!result.ok) throw new Error(result.status === 503 ? 'Voice input is not configured on the server yet.' : 'Could not transcribe. Please try again.');
      const data = await result.json();
      if (id === generation.current && !!recordingAccount && recordingAccount === accountRef.current && !disabledRef.current && sessionEnabledRef.current && foregroundRef.current) { const text = typeof data.text === 'string' ? data.text.trim() : ''; if (text) onTranscript(text); setNotice(text ? 'Review your words before continuing.' : 'No words detected. Try again.'); }
    } catch (e) { if (id === generation.current) setNotice(e instanceof Error ? e.message : 'Microphone interrupted.'); }
    finally { if (id === generation.current) { await discard(); setPhase('idle'); } }
  }
  async function start() {
    if (!accountRef.current || disabledRef.current || !sessionEnabledRef.current || !foregroundRef.current || locked.current || preparing.current) return;
    preparing.current = true;
    locked.current = true;
    const recordingAccount = accountRef.current;
    capturedAccount.current = recordingAccount;
    const id = ++generation.current; setPhase('starting'); setNotice('');
    try {
      // Do not interrupt Guardian speech until microphone permission is granted.
      const permission = await requestRecordingPermissionsAsync();
      if (id !== generation.current || !recordingAccount || recordingAccount !== accountRef.current || disabledRef.current || !sessionEnabledRef.current || !foregroundRef.current) return;
      if (!permission.granted) throw new Error('Microphone permission is off. Enable it in device settings to speak.');
      // The user has explicitly requested recording; avoid speaking over the microphone.
      audio.stopSpeech();
      await stopCompanion();
      if (id !== generation.current || !recordingAccount || recordingAccount !== accountRef.current || disabledRef.current || !sessionEnabledRef.current || !foregroundRef.current) return;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (id !== generation.current || !recordingAccount || recordingAccount !== accountRef.current || disabledRef.current || !sessionEnabledRef.current || !foregroundRef.current) { await discard(); return; }
      recorder.record();
      // A cancelled session must not be revived by a late native recorder completion.
      if (id !== generation.current || !recordingAccount || recordingAccount !== accountRef.current || disabledRef.current || !sessionEnabledRef.current || !foregroundRef.current) { await discard(); return; }
      active.current = true; setPhase('listening');
      timer.current = setTimeout(() => { void finish(); }, 60000);
    } catch (e) { if (id === generation.current) { await discard(); setPhase('idle'); setNotice(e instanceof Error ? e.message : 'Microphone unavailable.'); } }
    finally { preparing.current = false; }
  }
  return <View style={{ paddingHorizontal: 20, paddingVertical: 8, gap: 8 }}>
    <Text style={{ color: '#AEB5C0', fontSize: 12 }}>Microphone is off by default until you tap Speak. It runs only in the foreground, for up to 60 seconds. Stopping sends audio for transcription; review before sending.</Text>
    <Text accessibilityRole="text" style={{ color: phase === 'listening' ? '#F1DFA7' : '#AEB5C0', fontSize: 12 }}>{!sessionEnabled ? 'VOICE SESSION OFF' : phase === 'listening' ? 'MICROPHONE ACTIVE · RECORDING' : phase === 'transcribing' ? 'MICROPHONE OFF · TRANSCRIBING' : phase === 'starting' ? 'REQUESTING MICROPHONE' : 'MICROPHONE OFF · READY'}</Text>
    <View style={{ flexDirection: 'row', gap: 20 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={phase === 'listening' ? 'Stop recording and transcribe' : 'Start recording with microphone'} disabled={disabled || !account || !sessionEnabled || phase === 'starting' || phase === 'transcribing'} onPress={() => { void (phase === 'listening' ? finish() : start()); }}><Text style={{ color: '#F3F4F6', paddingVertical: 10 }}>{phase === 'listening' ? `Stop listening · ${Math.floor(status.durationMillis / 1000)}s` : phase === 'transcribing' ? 'Transcribing…' : phase === 'starting' ? 'Opening microphone…' : 'Speak · up to 60 seconds'}</Text></Pressable>
      {phase !== 'idle' && <Pressable accessibilityRole="button" accessibilityLabel="Discard recording without transcription" onPress={() => { void discard(); setPhase('idle'); setNotice('Recording discarded.'); }}><Text style={{ color: '#DDE3EA', paddingVertical: 10 }}>Cancel</Text></Pressable>}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={sessionEnabled ? 'Disable Guardian microphone session' : 'Enable Guardian microphone session'} onPress={() => { const next = !sessionEnabledRef.current; sessionEnabledRef.current = next; setSessionEnabled(next); if (!next) { void discard(); setPhase('idle'); setNotice('Voice session ended. Microphone off.'); } }}><Text style={{ color: '#F3F4F6', paddingVertical: 8 }}>{sessionEnabled ? 'End voice session' : 'Enable voice session'}</Text></Pressable>
    {!!notice && <Text accessibilityRole="alert" style={{ color: '#DDE3EA', fontSize: 12 }}>{notice}</Text>}
  </View>;
}
