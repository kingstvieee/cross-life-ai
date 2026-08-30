import { glow } from "@/lib/staarwardd/shadow";
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
    desc: 'Every coordination is explained transparently in Guardian View — what was noticed, what was done, and why. Press START THE DEMO and we’ll take you straight to the Work signal.',
  },
];

export function Walkthrough({ onDone, onFinish }: { onDone: () => void; onFinish?: () => void }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  const advance = () => (last ? (onFinish ?? onDone)() : setStep(step + 1));

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.scrim} testID="walkthrough-overlay">
      <Pressable accessibilityRole="button" accessibilityLabel="Next walkthrough step" style={{ flex: 1 }} onPress={advance} />
      <Animated.View
        key={step}
        entering={FadeInDown.duration(300)}
        style={[styles.card, { marginBottom: insets.bottom + 16, maxWidth: 560, width: '92%', alignSelf: 'center', marginHorizontal: 0 }]}
        accessibilityLabel={`Walkthrough step ${step + 1} of ${STEPS.length}: ${s.title}`}
      >
        <View style={styles.topRow}>
          <View style={styles.iconWrap}>
            <Ionicons name={s.icon} size={16} color="#00E5FF" />
          </View>
          <Text style={styles.kicker}>JUDGE WALKTHROUGH · {step + 1}/{STEPS.length}</Text>
          <Pressable accessibilityRole="button" onPress={onDone} hitSlop={10} testID="walkthrough-skip">
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
          <Pressable accessibilityRole="button" style={styles.next} onPress={advance} testID="walkthrough-next">
            <Text style={styles.nextText}>{last ? 'START THE DEMO' : 'NEXT'}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', zIndex: 50,
  },
  card: {
    marginHorizontal: 16, backgroundColor: '#15171D', borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    ...glow('#00E5FF', 30, 0.15),
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 30, height: 30, borderRadius: 999, backgroundColor: 'rgba(0,51,61,0.6)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,229,255,0.35)',
  },
  kicker: { flex: 1, fontSize: 9, letterSpacing: 2, fontWeight: '800', color: '#9CA3AF' },
  skip: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: '#9CA3AF' },
  title: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginTop: 12 },
  desc: { fontSize: 13.5, color: '#D1D5DB', opacity: 0.85, lineHeight: 20, marginTop: 6 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  dotStep: { width: 6, height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotOn: { backgroundColor: '#00E5FF', width: 16 },
  next: { backgroundColor: '#00E5FF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999 },
  nextText: { color: '#000000', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
});
