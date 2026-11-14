import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, Text, View } from 'react-native';
import { GuardianMotionVideo } from './guardian-motion-video';
import { observeSpeech, SpeechState } from '@/src/server-speech';

export function GuardianPresence({ listening = false, thinking = false }: { listening?: boolean; thinking?: boolean }) {
  const [speech, setSpeech] = useState<SpeechState>('idle');
  const [quietMotion, setQuietMotion] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [failed, setFailed] = useState(false);
  useEffect(() => observeSpeech(setSpeech), []);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setQuietMotion);
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setQuietMotion);
    const app = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => { motion.remove(); app.remove(); };
  }, []);
  const ready = useCallback(() => setFailed(false), []);
  const failure = useCallback(() => setFailed(true), []);
  const label = listening ? 'Listening' : thinking || speech === 'loading' ? 'Preparing your reply' : speech === 'speaking' ? 'Speaking' : speech === 'failed' ? 'Voice unavailable' : 'Ready';
  return <View accessibilityLabel={`Guardian presence. ${label}`} style={{ alignItems: 'center', height: 210, overflow: 'hidden', borderBottomWidth: 1, borderColor: '#363D46', backgroundColor: '#080A0D' }}>
    {!quietMotion && foreground && !failed && <GuardianMotionVideo clip="hover" size={165} onReady={ready} onFailure={failure} />}
    <View style={{ position: 'absolute', bottom: 10, alignItems: 'center', gap: 5 }}>
      <Text style={{ color: '#DDE3EA', letterSpacing: 2, fontSize: 11 }}>GUARDIAN · {label.toUpperCase()}</Text>
      <Text style={{ color: '#8D98A6', fontSize: 10 }}>{quietMotion ? 'Motion reduced' : failed ? 'Motion unavailable' : 'Animated presence · speech animation pending'}</Text>
    </View>
  </View>;
}
