import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/auth';
import { PORTAL_IDS, portalMeta } from '@/src/theme';

const AUTONOMY = [
  { id: 'suggest', name: 'SUGGEST' },
  { id: 'assist', name: 'ASSIST' },
  { id: 'proactive', name: 'PROACTIVE' },
];
const COMPANIONS = [
  { id: 'guardian', name: 'Guardian' },
  { id: 'kaia', name: 'Kaia' },
  { id: 'atlas', name: 'Atlas' },
];

export default function Settings() {
  const router = useRouter();
  const { user, patchProfile, api, logout, refresh } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

  if (!user) return null;

  const privacy = user.portal_privacy || {};

  const setPrivacy = async (portal: string, key: 'access' | 'share', value: boolean) => {
    const next = { ...privacy, [portal]: { access: true, share: true, confirm: false, ...(privacy[portal] || {}), [key]: value } };
    await api('/api/user/privacy', { method: 'POST', body: JSON.stringify({ portal_privacy: next }) });
    await refresh();
  };

  const setPaused = async (v: boolean) => {
    await api('/api/user/privacy', { method: 'POST', body: JSON.stringify({ cross_life_paused: v }) });
    await refresh();
  };

  const reseed = async () => {
    setBusy('reseed');
    await api('/api/demo/reseed', { method: 'POST' });
    setBusy(null);
  };

  const doLogout = async () => {
    setBusy('logout');
    await logout();
    router.replace('/landing');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']} testID="settings-root">
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} testID="back-btn">
          <Ionicons name="chevron-back" size={20} color="#0A0A0A" />
        </Pressable>
        <View>
          <Text style={styles.h}>Privacy & Control</Text>
          <Text style={styles.sub}>{user.email?.toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionH}>GUARDIAN AUTONOMY</Text>
        <View style={styles.segment}>
          {AUTONOMY.map((a) => (
            <Pressable
              key={a.id}
              style={[styles.segmentItem, user.autonomy === a.id && styles.segmentOn]}
              onPress={() => patchProfile({ autonomy: a.id as any })}
              testID={`autonomy-${a.id}`}
            >
              <Text style={[styles.segmentText, user.autonomy === a.id && { color: '#FFFFFF' }]}>{a.name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionH}>COMPANION</Text>
        <View style={styles.segment}>
          {COMPANIONS.map((c) => (
            <Pressable
              key={c.id}
              style={[styles.segmentItem, user.companion === c.id && styles.segmentOn]}
              onPress={() => patchProfile({ companion: c.id as any })}
              testID={`companion-${c.id}`}
            >
              <Text style={[styles.segmentText, user.companion === c.id && { color: '#FFFFFF' }]}>{c.name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionH}>CROSS-LIFE INTELLIGENCE</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Pause cross-life connections</Text>
            <Text style={styles.rowDesc}>Guardian stops linking context between portals.</Text>
          </View>
          <Switch
            value={!!user.cross_life_paused}
            onValueChange={setPaused}
            trackColor={{ true: '#0A0A0A', false: '#E4E7EC' }}
            thumbColor="#FFFFFF"
            testID="pause-switch"
          />
        </View>

        <Text style={styles.sectionH}>PORTAL ACCESS</Text>
        {PORTAL_IDS.map((p) => {
          const pv = privacy[p] || { access: true, share: true };
          return (
            <View key={p} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: portalMeta[p].accent }]} />
              <Text style={[styles.rowTitle, { flex: 1 }]}>{portalMeta[p].name}</Text>
              <View style={{ alignItems: 'center', marginRight: 14 }}>
                <Text style={styles.tiny}>ACCESS</Text>
                <Switch
                  value={pv.access !== false}
                  onValueChange={(v) => setPrivacy(p, 'access', v)}
                  trackColor={{ true: '#0A0A0A', false: '#E4E7EC' }}
                  thumbColor="#FFFFFF"
                  testID={`access-${p}`}
                />
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.tiny}>SHARE</Text>
                <Switch
                  value={pv.share !== false}
                  onValueChange={(v) => setPrivacy(p, 'share', v)}
                  trackColor={{ true: '#0A0A0A', false: '#E4E7EC' }}
                  thumbColor="#FFFFFF"
                  testID={`share-${p}`}
                />
              </View>
            </View>
          );
        })}

        <Text style={styles.sectionH}>DEMO</Text>
        <Pressable style={styles.outlineBtn} onPress={reseed} disabled={!!busy} testID="reseed-btn">
          {busy === 'reseed' ? <ActivityIndicator color="#0A0A0A" /> : <Text style={styles.outlineBtnText}>RESET DEMO SCENARIO</Text>}
        </Pressable>

        <Pressable style={[styles.outlineBtn, { borderColor: 'rgba(139,0,0,0.3)', marginTop: 12 }]} onPress={doLogout} disabled={!!busy} testID="logout-btn">
          {busy === 'logout' ? <ActivityIndicator color="#8B0000" /> : <Text style={[styles.outlineBtnText, { color: '#8B0000' }]}>SIGN OUT</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.12)', backgroundColor: '#FFFFFF',
  },
  h: { fontSize: 22, fontWeight: '800', color: '#0A0A0A' },
  sub: { fontSize: 9, letterSpacing: 1.5, color: '#0A0A0A', opacity: 0.5, fontWeight: '700', marginTop: 2 },
  sectionH: { marginTop: 26, marginBottom: 10, fontSize: 11, letterSpacing: 3, fontWeight: '800', color: '#0A0A0A', opacity: 0.55 },
  segment: { flexDirection: 'row', gap: 8 },
  segmentItem: {
    flex: 1, paddingVertical: 13, borderRadius: 999, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.14)', backgroundColor: '#F5F5F7',
  },
  segmentOn: { backgroundColor: '#0A0A0A', borderColor: '#0A0A0A' },
  segmentText: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: '#0A0A0A' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15, borderRadius: 16, marginBottom: 10,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(10,10,10,0.09)',
  },
  rowTitle: { fontSize: 14.5, fontWeight: '700', color: '#0A0A0A' },
  rowDesc: { fontSize: 12, color: '#1D1D1F', opacity: 0.55, marginTop: 3, lineHeight: 17 },
  dot: { width: 10, height: 10, borderRadius: 999 },
  tiny: { fontSize: 7, letterSpacing: 1, fontWeight: '800', color: '#0A0A0A', opacity: 0.45, marginBottom: 2 },
  outlineBtn: {
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.16)', paddingVertical: 15, borderRadius: 999,
    alignItems: 'center', backgroundColor: '#FFFFFF',
  },
  outlineBtnText: { color: '#0A0A0A', fontWeight: '700', letterSpacing: 2, fontSize: 12 },
});
