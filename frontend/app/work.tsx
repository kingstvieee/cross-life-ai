import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/src/auth';
import { portalMeta } from '@/src/theme';
import { CoordinationSheet } from '@/src/coordination-sheet';

const PRIORITY_STYLE: Record<string, { bg: string; fg: string }> = {
  urgent: { bg: 'rgba(255,23,68,0.14)', fg: '#FF5C7A' },
  high: { bg: 'rgba(255,214,0,0.12)', fg: '#FFD600' },
  medium: { bg: '#1F222B', fg: '#9CA3AF' },
  low: { bg: '#1F222B', fg: '#9CA3AF' },
};

export default function Work() {
  const router = useRouter();
  const { api } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [busy, setBusy] = useState<null | 'coordinate' | 'simulate'>(null);
  const [coord, setCoord] = useState<any | null>(null);
  const [modal, setModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api('/api/portal/work/state');
      if (r.ok) setData((await r.json()).data);
    } catch {}
  }, [api]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveTasks = async (tasks: any[]) => {
    const next = { ...data, tasks };
    setData(next);
    await api('/api/portal/work/state', { method: 'POST', body: JSON.stringify({ data: next }) });
  };

  const toggleTask = (id: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    saveTasks((data?.tasks || []).map((t: any) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const coordinate = async () => {
    setBusy('coordinate');
    try {
      const r = await api('/api/guardian/coordinate-evening', { method: 'POST', body: JSON.stringify({ approve: true }) });
      if (r.ok) {
        setCoord(await r.json());
        setModal(true);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {}
    setBusy(null);
  };

  const simulate = async () => {
    setBusy('simulate');
    try {
      await api('/api/demo/reseed', { method: 'POST' });
      await load();
    } catch {}
    setBusy(null);
  };

  const isHigh = data?.workload === 'high' || (data?.stress || 0) >= 7;
  const tasks = data?.tasks || [];

  return (
    <View style={styles.root} testID="work-root">
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Cinematic header */}
        <View style={styles.hero}>
          <Image source={{ uri: portalMeta.work.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          <LinearGradient colors={['rgba(10,11,14,0.25)', 'rgba(10,11,14,0.6)', '#0A0B0E']} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['top']} style={styles.heroInner}>
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backBtn} onPress={() => router.back()} testID="back-btn">
              <Ionicons name="chevron-back" size={20} color="#F3F4F6" />
            </Pressable>
          </SafeAreaView>
          <View style={styles.heroBottom}>
            <Text style={styles.kicker}>PORTAL</Text>
            <Text style={styles.title}>Work</Text>
            <Text style={styles.tagline}>{portalMeta.work.tagline}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, width: '100%', maxWidth: 680, alignSelf: 'center' }}>
          {/* Status row */}
          <View style={styles.statusRow}>
            <View style={[styles.badge, { backgroundColor: isHigh ? 'rgba(255,23,68,0.14)' : 'rgba(0,229,255,0.12)' }]}>
              <Text style={[styles.badgeText, { color: isHigh ? '#FF5C7A' : '#00E5FF' }]}>
                WORKLOAD {String(data?.workload || 'normal').toUpperCase()}
              </Text>
            </View>
            <View style={styles.stressWrap}>
              <Text style={styles.stressLabel}>STRESS</Text>
              <View style={{ flexDirection: 'row', gap: 3 }}>
                {[...Array(10)].map((_, i) => (
                  <View key={i} style={[styles.stressBar, i < (data?.stress || 0) && { backgroundColor: i >= 6 ? '#FF5C7A' : '#00E5FF', opacity: 1 }]} />
                ))}
              </View>
            </View>
          </View>

          {/* Guardian intervention */}
          {isHigh ? (
            <View style={styles.guardianCard} testID="guardian-intervention">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="flash" size={14} color="#00E5FF" />
                <Text style={styles.gKicker}>THE GUARDIAN NOTICED</Text>
              </View>
              <Text style={styles.gText}>
                Work has been unusually heavy — urgent items unresolved, your stress signal is elevated, and you're meeting Amara at 8 PM.
                Want me to coordinate your evening across Wellbeing, Home, Style and Relationships?
              </Text>
              <Pressable accessibilityRole="button" style={styles.gCta} onPress={coordinate} disabled={!!busy} testID="coordinate-evening-btn">
                {busy === 'coordinate'
                  ? <ActivityIndicator color="#000000" />
                  : <Text style={styles.gCtaText}>COORDINATE MY EVENING</Text>}
              </Pressable>
            </View>
          ) : (
            <Pressable accessibilityRole="button" style={styles.simulateBtn} onPress={simulate} disabled={!!busy} testID="simulate-btn">
              {busy === 'simulate'
                ? <ActivityIndicator color="#F3F4F6" />
                : <Text style={styles.simulateText}>SIMULATE HIGH-WORKLOAD DAY</Text>}
            </Pressable>
          )}

          {/* Tasks */}
          <Text style={styles.sectionH}>TASKS</Text>
          {tasks.length === 0 && <Text style={styles.empty}>No tasks yet. Simulate the demo scenario to see the Guardian at work.</Text>}
          {tasks.map((t: any) => {
            const ps = PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.medium;
            return (
              <Pressable accessibilityRole="button" key={t.id} style={styles.task} onPress={() => toggleTask(t.id)} testID={`task-${t.id}`}>
                <View style={[styles.check, t.done && styles.checkOn]}>
                  {t.done && <Ionicons name="checkmark" size={14} color="#000000" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, t.done && { textDecorationLine: 'line-through', opacity: 0.4 }]}>{t.title}</Text>
                  {t.needs_you && !t.done && <Text style={styles.needsYou}>NEEDS YOU</Text>}
                </View>
                <View style={[styles.pill, { backgroundColor: ps.bg }]}>
                  <Text style={[styles.pillText, { color: ps.fg }]}>{t.priority.toUpperCase()}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Coordination result sheet */}
      <CoordinationSheet
        visible={modal}
        onClose={() => setModal(false)}
        coord={coord}
        headline="Evening coordinated."
        sub={`One signal in Work. ${coord?.actions?.length || 0} portals aligned in a single pass.`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0B0E' },
  hero: { height: 270 },
  heroInner: { paddingHorizontal: 20, paddingTop: 8 },
  backBtn: {
    width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(21,23,29,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  heroBottom: { position: 'absolute', bottom: 14, left: 24 },
  kicker: { fontSize: 10, letterSpacing: 3, fontWeight: '800', color: '#00E5FF' },
  title: { fontSize: 34, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  tagline: { fontSize: 13, color: '#D1D5DB', opacity: 0.8, marginTop: 2 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  badge: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  stressWrap: { alignItems: 'flex-end', gap: 5 },
  stressLabel: { fontSize: 9, letterSpacing: 2, fontWeight: '700', color: '#9CA3AF' },
  stressBar: { width: 8, height: 14, borderRadius: 2, backgroundColor: '#FFFFFF', opacity: 0.1 },
  guardianCard: {
    marginTop: 20, padding: 20, borderRadius: 20, backgroundColor: 'rgba(0,51,61,0.4)',
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.4)',
  },
  gKicker: { fontSize: 10, letterSpacing: 2.5, fontWeight: '800', color: '#7EDCF3' },
  gText: { marginTop: 10, fontSize: 15, lineHeight: 22, color: '#F3F4F6', fontWeight: '500' },
  gCta: {
    marginTop: 16, backgroundColor: '#00E5FF', paddingVertical: 16, borderRadius: 999, alignItems: 'center',
    shadowColor: '#00E5FF', shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  gCtaText: { color: '#000000', fontWeight: '800', letterSpacing: 2.5, fontSize: 12 },
  simulateBtn: {
    marginTop: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', paddingVertical: 15,
    borderRadius: 999, alignItems: 'center', backgroundColor: '#15171D',
  },
  simulateText: { color: '#F3F4F6', fontWeight: '700', letterSpacing: 2, fontSize: 12 },
  sectionH: { marginTop: 28, marginBottom: 10, fontSize: 11, letterSpacing: 3, fontWeight: '800', color: '#9CA3AF' },
  empty: { fontSize: 14, color: '#9CA3AF' },
  task: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, marginBottom: 10,
    backgroundColor: '#15171D', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  check: {
    width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkOn: { backgroundColor: '#00E5FF', borderColor: '#00E5FF' },
  taskTitle: { fontSize: 14.5, fontWeight: '600', color: '#F3F4F6' },
  needsYou: { fontSize: 9, letterSpacing: 1.5, fontWeight: '800', color: '#FFD600', marginTop: 3 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pillText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
});
