import { glow } from "@/lib/staarwardd/shadow";
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth';
import { PORTAL_IDS, portalMeta } from '@/src/theme';
import { COMPANIONS, CompanionId, speakCompanion, stopCompanion } from '@/src/companions';

const AUTONOMY = [
  { id: 'suggest', name: 'SUGGEST', desc: 'Guardian recommends. You act.' },
  { id: 'assist', name: 'ASSIST', desc: 'Guardian prepares. Asks first.' },
  { id: 'proactive', name: 'PROACTIVE', desc: 'Guardian initiates low-risk routines.' },
];

export default function Onboarding() {
  const router = useRouter();
  const { patchProfile, user } = useAuth();
  const [step, setStep] = useState(0);
  const [portals, setPortals] = useState<string[]>([...PORTAL_IDS]);
  const [autonomy, setAutonomy] = useState<'suggest'|'assist'|'proactive'>('assist');
  const [companion, setCompanion] = useState<CompanionId>(user?.companion ?? 'atlas');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => () => { void stopCompanion(); }, []);

  const next = async () => {
    if (step === 3) {
      if (saving) return;
      setSaving(true); setError('');
      try {
        await patchProfile({ portals_enabled: portals, autonomy, companion, onboarding_complete: true });
        router.replace('/hub');
      } catch (e) { setError(e instanceof Error ? e.message : 'Setup could not be saved. Please try again.'); }
      finally { setSaving(false); }
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
          accessibilityRole="button"
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
          accessibilityRole="button"
                key={a.id}
                testID={`autonomy-${a.id}`}
                onPress={() => setAutonomy(a.id as any)}
                    style={[styles.card, autonomy === a.id && styles.cardOn]}
              >
                <Text style={[styles.cardTitle, autonomy === a.id && { color: '#DDE3EA' }]}>{a.name}</Text>
                <Text style={[styles.cardDesc, autonomy === a.id && { color: '#D1D5DB' }]}>{a.desc}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {step === 3 && (
          <View>
            <Text style={styles.h}>Choose your companion.</Text>
            <Text style={styles.p}>The same abilities and account history. Two distinct presences. Guardian remains the central system.</Text>
            {user?.companion === 'guardian' && (
              <Pressable accessibilityRole="radio" accessibilityState={{ checked: companion === 'guardian' }}
                onPress={() => { setCompanion('guardian'); void stopCompanion(); }}
                style={[styles.card, companion === 'guardian' && styles.cardOn]}>
                <Text style={styles.cardTitle}>Guardian (keep current)</Text>
                <Text style={styles.cardDesc}>Central system only.</Text>
              </Pressable>
            )}
            {COMPANIONS.map((c) => (
              <View key={c.id} style={[styles.card, companion === c.id && styles.cardOn]}>
                <Pressable accessibilityRole="radio" accessibilityState={{ checked: companion === c.id }}
                  testID={`companion-${c.id}`} onPress={() => { setCompanion(c.id); void stopCompanion(); }}>
                  <Text style={styles.cardTitle}>{c.name}</Text>
                  <Text style={styles.cardDesc}>{c.desc}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Preview ${c.name} voice`}
                  onPress={() => { void speakCompanion(c.preview, c.id).catch(() => setError('Voice preview is unavailable on this device.')); }}
                  style={{ paddingVertical: 12 }}><Text style={styles.p}>Hear {c.name}</Text></Pressable>
              </View>
            ))}
            <Text style={styles.p}>Preview uses an AI companion voice. Listen before choosing; voice quality still needs your approval.</Text>
          </View>
        )}
      </ScrollView>
      {error ? <Text accessibilityRole="alert" style={[styles.p, { paddingHorizontal: 24 }]}>{error}</Text> : null}

      <Pressable accessibilityRole="button" disabled={saving} style={styles.cta} onPress={next} testID="onboarding-next-btn">
        <Text style={styles.ctaText}>{saving ? 'SAVING' : step === 3 ? 'ENTER HUB' : 'CONTINUE'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0B0E' },
  kicker: { letterSpacing: 3, fontSize: 11, color: '#DDE3EA', fontWeight: '800' },
  h: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginTop: 12, marginBottom: 12, letterSpacing: 0.4 },
  p: { fontSize: 15, color: '#D1D5DB', opacity: 0.85, lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: '#15171D',
  },
  chipOn: { backgroundColor: '#DDE3EA', borderColor: '#DDE3EA' },
  chipText: { color: '#F3F4F6', fontWeight: '600' },
  chipTextOn: { color: '#000000' },
  card: {
    marginTop: 12, padding: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#15171D',
  },
  cardOn: { backgroundColor: '#202329', borderColor: 'rgba(220,225,233,0.6)' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 2 },
  cardDesc: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  cta: {
    marginHorizontal: 24, marginBottom: 32, backgroundColor: '#DDE3EA', paddingVertical: 18, borderRadius: 999,
    alignItems: 'center', ...glow('#DDE3EA', 18, 0.45), elevation: 8,
  },
  ctaText: { color: '#000000', fontWeight: '800', letterSpacing: 3 },
});
