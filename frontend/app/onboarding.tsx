import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth';
import { PORTAL_IDS, portalMeta } from '@/src/theme';

const AUTONOMY = [
  { id: 'suggest', name: 'SUGGEST', desc: 'Guardian recommends. You act.' },
  { id: 'assist', name: 'ASSIST', desc: 'Guardian prepares. Asks first.' },
  { id: 'proactive', name: 'PROACTIVE', desc: 'Guardian initiates low-risk routines.' },
];
const COMPANIONS = [
  { id: 'guardian', name: 'Guardian Only', desc: 'Central intelligence.' },
  { id: 'kaia', name: 'Guardian + Kaia', desc: 'Warm, emotionally perceptive.' },
  { id: 'atlas', name: 'Guardian + Atlas', desc: 'Direct, grounded, practical.' },
];

export default function Onboarding() {
  const router = useRouter();
  const { patchProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [portals, setPortals] = useState<string[]>([...PORTAL_IDS]);
  const [autonomy, setAutonomy] = useState<'suggest'|'assist'|'proactive'>('assist');
  const [companion, setCompanion] = useState<'guardian'|'kaia'|'atlas'>('guardian');

  const next = async () => {
    if (step === 3) {
      await patchProfile({ portals_enabled: portals, autonomy, companion, onboarding_complete: true } as any);
      router.replace('/hub');
      return;
    }
    setStep(step + 1);
  };

  return (
    <SafeAreaView style={styles.root} testID="onboarding-root">
      <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }}>
        <Text style={styles.kicker}>STAAR HUB · SETUP {step + 1} / 4</Text>
        {step === 0 && (
          <View>
            <Text style={styles.h}>Welcome.</Text>
            <Text style={styles.p}>Your Guardian is about to meet the parts of your life. Only what you allow.</Text>
          </View>
        )}
        {step === 1 && (
          <View>
            <Text style={styles.h}>Which portals should your Guardian understand?</Text>
            <View style={styles.grid}>
              {PORTAL_IDS.map((p) => {
                const on = portals.includes(p);
                const meta = portalMeta[p];
                return (
                  <Pressable
                    key={p}
                    testID={`portal-toggle-${p}`}
                    onPress={() => setPortals((cur) => (on ? cur.filter((x) => x !== p) : [...cur, p]))}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{meta.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
        {step === 2 && (
          <View>
            <Text style={styles.h}>How proactive should your Guardian be?</Text>
            {AUTONOMY.map((a) => (
              <Pressable
                key={a.id}
                testID={`autonomy-${a.id}`}
                onPress={() => setAutonomy(a.id as any)}
                style={[styles.card, autonomy === a.id && styles.cardOn]}
              >
                <Text style={[styles.cardTitle, autonomy === a.id && { color: '#FFFFFF' }]}>{a.name}</Text>
                <Text style={[styles.cardDesc, autonomy === a.id && { color: '#FFFFFF', opacity: 0.8 }]}>{a.desc}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {step === 3 && (
          <View>
            <Text style={styles.h}>Choose your companion.</Text>
            {COMPANIONS.map((c) => (
              <Pressable
                key={c.id}
                testID={`companion-${c.id}`}
                onPress={() => setCompanion(c.id as any)}
                style={[styles.card, companion === c.id && styles.cardOn]}
              >
                <Text style={[styles.cardTitle, companion === c.id && { color: '#FFFFFF' }]}>{c.name}</Text>
                <Text style={[styles.cardDesc, companion === c.id && { color: '#FFFFFF', opacity: 0.8 }]}>{c.desc}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable style={styles.cta} onPress={next} testID="onboarding-next-btn">
        <Text style={styles.ctaText}>{step === 3 ? 'ENTER HUB' : 'CONTINUE'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  kicker: { letterSpacing: 3, fontSize: 11, color: '#0A0A0A', opacity: 0.55, fontWeight: '700' },
  h: { fontSize: 26, fontWeight: '800', color: '#0A0A0A', marginTop: 12, marginBottom: 12, letterSpacing: 0.4 },
  p: { fontSize: 15, color: '#1D1D1F', opacity: 0.75, lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.16)', backgroundColor: '#FFFFFF',
  },
  chipOn: { backgroundColor: '#0A0A0A', borderColor: '#0A0A0A' },
  chipText: { color: '#0A0A0A', fontWeight: '600' },
  chipTextOn: { color: '#FFFFFF' },
  card: {
    marginTop: 12, padding: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(10,10,10,0.10)',
    backgroundColor: '#F5F5F7',
  },
  cardOn: { backgroundColor: '#0A0A0A', borderColor: '#0A0A0A' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0A0A0A', letterSpacing: 2 },
  cardDesc: { fontSize: 13, color: '#1D1D1F', opacity: 0.7, marginTop: 4 },
  cta: {
    marginHorizontal: 24, marginBottom: 32, backgroundColor: '#0A0A0A', paddingVertical: 18, borderRadius: 999,
    alignItems: 'center', shadowColor: '#D4AF37', shadowOpacity: 0.4, shadowRadius: 16,
  },
  ctaText: { color: '#FFFFFF', fontWeight: '700', letterSpacing: 3 },
});
