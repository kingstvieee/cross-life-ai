import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const STEPS = [
  {
    icon: 'sparkles' as const,
    title: 'Welcome, judge.',
    desc: 'This is STAAR Hub — one intelligence, The Guardian, watching seven connected portals of one life.',
  },
  {
    icon: 'flash' as const,
    title: 'The Guardian orb',
    desc: 'The orb at the center is live. The cyan lines are cross-life context flowing between portals right now.',
  },
  {
    icon: 'briefcase' as const,
    title: 'Act I — The evening',
    desc: 'Open the Work portal. The Guardian noticed an overloaded day and will coordinate your entire evening in one tap. Tap “Hear the Guardian” to hear it speak.',
  },
  {
    icon: 'sunny' as const,
    title: 'Act II — The morning',
    desc: 'In Settings, load the Morning scenario: a rough night reshapes Work and Style ahead of a 9:30 presentation.',
  },
  {
    icon: 'eye' as const,
    title: 'Guardian View',
    desc: 'Every coordination is explained transparently in Guardian View — what was noticed, what was done, and why. Enjoy.',
  },
];

export function Walkthrough({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.scrim} testID="walkthrough-overlay">
      <Pressable style={{ flex: 1 }} onPress={() => (last ? onDone() : setStep(step + 1))} />
      <Animated.View key={step} entering={FadeInDown.duration(300)} style={[styles.card, { marginBottom: insets.bottom + 20 }]}>
        <View style={styles.topRow}>
          <View style={styles.iconWrap}>
            <Ionicons name={s.icon} size={16} color="#0A0A0A" />
          </View>
          <Text style={styles.kicker}>JUDGE WALKTHROUGH · {step + 1}/{STEPS.length}</Text>
          <Pressable onPress={onDone} hitSlop={10} testID="walkthrough-skip">
            <Text style={styles.skip}>SKIP</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.desc}>{s.desc}</Text>
        <View style={styles.bottomRow}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dotStep, i === step && styles.dotOn]} />
            ))}
          </View>
          <Pressable style={styles.next} onPress={() => (last ? onDone() : setStep(step + 1))} testID="walkthrough-next">
            <Text style={styles.nextText}>{last ? 'START THE DEMO' : 'NEXT'}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,10,10,0.45)', justifyContent: 'flex-end', zIndex: 50,
  },
  card: {
    marginHorizontal: 16, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.08)',
    shadowColor: '#0A0A0A', shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 10 },
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 30, height: 30, borderRadius: 999, backgroundColor: '#F5F5F7',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(10,10,10,0.1)',
  },
  kicker: { flex: 1, fontSize: 9, letterSpacing: 2, fontWeight: '800', color: '#0A0A0A', opacity: 0.55 },
  skip: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: '#0A0A0A', opacity: 0.5 },
  title: { fontSize: 20, fontWeight: '800', color: '#0A0A0A', marginTop: 12 },
  desc: { fontSize: 13.5, color: '#1D1D1F', opacity: 0.7, lineHeight: 20, marginTop: 6 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  dotStep: { width: 6, height: 6, borderRadius: 999, backgroundColor: 'rgba(10,10,10,0.15)' },
  dotOn: { backgroundColor: '#0A0A0A', width: 16 },
  next: { backgroundColor: '#0A0A0A', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999 },
  nextText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
});
