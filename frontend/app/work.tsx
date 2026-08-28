import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/src/auth';
import { theme, portalMeta } from '@/src/theme';

const PRIORITY_STYLE: Record<string, { bg: string; fg: string }> = {
  urgent: { bg: '#FFF0F0', fg: '#8B0000' },
  high: { bg: '#FDF5E6', fg: '#8A6D3B' },
  medium: { bg: '#F5F5F7', fg: '#1D1D1F' },
  low: { bg: '#F5F5F7', fg: '#1D1D1F' },
};

export default function Work() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { api, user } = useAuth();
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
          <Image source={{ uri: portalMeta.work.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.8)', '#FFFFFF']} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['top']} style={styles.heroInner}>
            <Pressable style={styles.backBtn} onPress={() => router.back()} testID="back-btn">
              <Ionicons name="chevron-back" size={20} color="#0A0A0A" />
            </Pressable>
          </SafeAreaView>
          <View style={styles.heroBottom}>
            <Text style={styles.kicker}>PORTAL</Text>
            <Text style={styles.title}>Work</Text>
            <Text style={styles.tagline}>{portalMeta.work.tagline}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 24 }}>
          {/* Status row */}
          <View style={styles.statusRow}>
            <View style={[styles.badge, { backgroundColor: isHigh ? '#FFF0F0' : '#E0F7FA' }]}>
              <Text style={[styles.badgeText, { color: isHigh ? '#8B0000' : '#006064' }]}>
                WORKLOAD {String(data?.workload || 'normal').toUpperCase()}
              </Text>
            </View>
            <View style={styles.stressWrap}>
              <Text style={styles.stressLabel}>STRESS</Text>
              <View style={{ flexDirection: 'row', gap: 3 }}>
                {[...Array(10)].map((_, i) => (
                  <View key={i} style={[styles.stressBar, i < (data?.stress || 0) && { backgroundColor: i >= 6 ? '#8B0000' : '#0A0A0A', opacity: 1 }]} />
                ))}
              </View>
            </View>
          </View>

          {/* Guardian intervention */}
          {isHigh ? (
            <View style={styles.guardianCard} testID="guardian-intervention">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="flash" size={14} color="#0A0A0A" />
                <Text style={styles.gKicker}>THE GUARDIAN NOTICED</Text>
              </View>
              <Text style={styles.gText}>
                Work has been unusually heavy — urgent items unresolved, your stress signal is elevated, and you're meeting Amara at 8 PM.
                Want me to coordinate your evening across Wellbeing, Home, Style and Relationships?
              </Text>
              <Pressable style={styles.gCta} onPress={coordinate} disabled={!!busy} testID="coordinate-evening-btn">
                {busy === 'coordinate'
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={styles.gCtaText}>COORDINATE MY EVENING</Text>}
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.simulateBtn} onPress={simulate} disabled={!!busy} testID="simulate-btn">
              {busy === 'simulate'
                ? <ActivityIndicator color="#0A0A0A" />
                : <Text style={styles.simulateText}>SIMULATE HIGH-WORKLOAD DAY</Text>}
            </Pressable>
          )}

          {/* Tasks */}
          <Text style={styles.sectionH}>TASKS</Text>
          {tasks.length === 0 && <Text style={styles.empty}>No tasks yet. Simulate the demo scenario to see the Guardian at work.</Text>}
          {tasks.map((t: any) => {
            const ps = PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.medium;
            return (
              <Pressable key={t.id} style={styles.task} onPress={() => toggleTask(t.id)} testID={`task-${t.id}`}>
                <View style={[styles.check, t.done && styles.checkOn]}>
                  {t.done && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
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

      {/* Coordination result modal */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.modalScrim}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.grabber} />
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 560 }}>
              <Text style={styles.sheetKicker}>CROSS-LIFE INTELLIGENCE</Text>
              <Text style={styles.sheetH}>Evening coordinated.</Text>
              <Text style={styles.sheetSub}>
                One signal in Work. {coord?.actions?.length || 0} portals aligned in a single pass.
              </Text>
              {(coord?.actions || []).map((a: any, i: number) => {
                const meta = portalMeta[a.portal];
                return (
                  <Animated.View key={i} entering={FadeInDown.delay(i * 120).duration(400)} style={styles.actionCard} testID={`action-${a.portal}`}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.dot, { backgroundColor: meta?.accent || '#0A0A0A' }]} />
                      <Text style={styles.actionPortal}>{meta?.name?.toUpperCase() || a.portal.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.actionTitle}>{a.title}</Text>
                    <Text style={styles.actionDetail}>{a.detail}</Text>
                    <View style={styles.itemsRow}>
                      {(a.items || []).map((it: string, j: number) => (
                        <View key={j} style={styles.itemChip}><Text style={styles.itemChipText}>{it}</Text></View>
                      ))}
                    </View>
                  </Animated.View>
                );
              })}
            </ScrollView>
            <Pressable
              style={styles.gCta}
              onPress={() => { setModal(false); router.push('/guardian-view'); }}
              testID="open-guardian-view-btn"
            >
              <Text style={styles.gCtaText}>OPEN GUARDIAN VIEW</Text>
            </Pressable>
            <Pressable style={{ alignItems: 'center', paddingVertical: 14 }} onPress={() => setModal(false)} testID="close-modal-btn">
              <Text style={{ fontWeight: '700', letterSpacing: 2, fontSize: 12, color: '#0A0A0A', opacity: 0.6 }}>CLOSE</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  hero: { height: 250 },
  heroInner: { paddingHorizontal: 20, paddingTop: 8 },
  backBtn: {
    width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: 'rgba(10,10,10,0.1)',
  },
  heroBottom: { position: 'absolute', bottom: 14, left: 24 },
  kicker: { fontSize: 10, letterSpacing: 3, fontWeight: '800', color: '#0A0A0A', opacity: 0.55 },
  title: { fontSize: 34, fontWeight: '800', color: '#0A0A0A', letterSpacing: 0.5 },
  tagline: { fontSize: 13, color: '#1D1D1F', opacity: 0.65, marginTop: 2 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  badge: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  stressWrap: { alignItems: 'flex-end', gap: 5 },
  stressLabel: { fontSize: 9, letterSpacing: 2, fontWeight: '700', color: '#0A0A0A', opacity: 0.5 },
  stressBar: { width: 8, height: 14, borderRadius: 2, backgroundColor: '#0A0A0A', opacity: 0.08 },
  guardianCard: {
    marginTop: 20, padding: 20, borderRadius: 20, backgroundColor: '#F5F5F7',
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.35)',
  },
  gKicker: { fontSize: 10, letterSpacing: 2.5, fontWeight: '800', color: '#0A0A0A', opacity: 0.65 },
  gText: { marginTop: 10, fontSize: 15, lineHeight: 22, color: '#0A0A0A', fontWeight: '500' },
  gCta: {
    marginTop: 16, backgroundColor: '#0A0A0A', paddingVertical: 16, borderRadius: 999, alignItems: 'center',
    shadowColor: '#D4AF37', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 5 },
  },
  gCtaText: { color: '#FFFFFF', fontWeight: '700', letterSpacing: 2.5, fontSize: 12 },
  simulateBtn: {
    marginTop: 20, borderWidth: 1, borderColor: 'rgba(10,10,10,0.16)', paddingVertical: 15,
    borderRadius: 999, alignItems: 'center', backgroundColor: '#FFFFFF',
  },
  simulateText: { color: '#0A0A0A', fontWeight: '700', letterSpacing: 2, fontSize: 12 },
  sectionH: { marginTop: 28, marginBottom: 10, fontSize: 11, letterSpacing: 3, fontWeight: '800', color: '#0A0A0A', opacity: 0.55 },
  empty: { fontSize: 14, color: '#1D1D1F', opacity: 0.55 },
  task: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, marginBottom: 10,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(10,10,10,0.09)',
  },
  check: {
    width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: 'rgba(10,10,10,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkOn: { backgroundColor: '#0A0A0A', borderColor: '#0A0A0A' },
  taskTitle: { fontSize: 14.5, fontWeight: '600', color: '#0A0A0A' },
  needsYou: { fontSize: 9, letterSpacing: 1.5, fontWeight: '800', color: '#8A6D3B', marginTop: 3 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pillText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  modalScrim: { flex: 1, backgroundColor: 'rgba(10,10,10,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 10,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: 'rgba(10,10,10,0.15)', marginBottom: 14 },
  sheetKicker: { fontSize: 10, letterSpacing: 3, fontWeight: '800', color: '#0A0A0A', opacity: 0.55 },
  sheetH: { fontSize: 26, fontWeight: '800', color: '#0A0A0A', marginTop: 6 },
  sheetSub: { fontSize: 13.5, color: '#1D1D1F', opacity: 0.65, marginTop: 4, marginBottom: 14 },
  actionCard: {
    padding: 16, borderRadius: 18, backgroundColor: '#F5F5F7', marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.06)',
  },
  dot: { width: 8, height: 8, borderRadius: 999 },
  actionPortal: { fontSize: 10, letterSpacing: 2, fontWeight: '800', color: '#0A0A0A', opacity: 0.6 },
  actionTitle: { fontSize: 16, fontWeight: '800', color: '#0A0A0A', marginTop: 6 },
  actionDetail: { fontSize: 13, color: '#1D1D1F', opacity: 0.7, marginTop: 4, lineHeight: 19 },
  itemsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  itemChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.1)',
  },
  itemChipText: { fontSize: 11, fontWeight: '600', color: '#0A0A0A' },
});
