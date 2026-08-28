import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/auth';
import { theme, portalMeta } from '@/src/theme';

export default function GuardianView() {
  const router = useRouter();
  const { api } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api('/api/guardian/view');
      if (r.ok) setItems(await r.json());
    } catch {}
  }, [api]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.root} edges={['top']} testID="guardian-view-root">
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} testID="back-btn">
          <Ionicons name="chevron-back" size={20} color="#0A0A0A" />
        </Pressable>
        <View>
          <Text style={styles.h}>Guardian View</Text>
          <Text style={styles.sub}>HOW INTELLIGENCE CONNECTS ACROSS YOUR LIFE</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0A0A0A" />}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="flash-outline" size={28} color="#0A0A0A" style={{ opacity: 0.4 }} />
            <Text style={styles.emptyH}>No coordinations yet.</Text>
            <Text style={styles.emptyP}>Open the Work portal and let the Guardian coordinate your evening to see cross-life intelligence in action.</Text>
            <Pressable style={styles.cta} onPress={() => router.push('/work')} testID="go-work-btn">
              <Text style={styles.ctaText}>OPEN WORK PORTAL</Text>
            </Pressable>
          </View>
        )}

        {items.map((c: any, idx: number) => (
          <View key={c.id || idx} style={styles.card} testID={`coordination-${idx}`}>
            <View style={styles.cardTop}>
              <View style={styles.liveDot} />
              <Text style={styles.cardKicker}>COORDINATION</Text>
              <Text style={styles.cardTime}>{c.created_at_iso ? new Date(c.created_at_iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
            </View>

            {/* Signal flow visualization */}
            {(c.signals || []).map((s: any, i: number) => (
              <View key={i} style={styles.flowRow}>
                <View style={[styles.flowPill, { backgroundColor: '#0A0A0A' }]}>
                  <Text style={[styles.flowPillText, { color: '#FFFFFF' }]}>{portalMeta[s.sourcePortal]?.name || s.sourcePortal}</Text>
                </View>
                <Ionicons name="arrow-forward" size={14} color={theme.color.energy} />
                <View style={styles.flowTargets}>
                  {(s.suggestedTargets || []).map((t: string) => (
                    <View key={t} style={styles.flowPill}>
                      <Text style={styles.flowPillText}>{portalMeta[t]?.name || t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
            {(c.signals || [])[0]?.summary && <Text style={styles.signalSummary}>{c.signals[0].summary}</Text>}

            <View style={styles.divider} />

            {(c.actions || []).map((a: any, i: number) => (
              <View key={i} style={styles.actionRow}>
                <View style={[styles.dot, { backgroundColor: portalMeta[a.portal]?.accent || '#0A0A0A' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>{a.title}</Text>
                  <Text style={styles.actionDetail}>{a.detail}</Text>
                </View>
              </View>
            ))}

            <View style={styles.confRow}>
              <Text style={styles.conf}>CONFIDENCE {(Math.round(((c.signals || [])[0]?.confidence || 0.9) * 100))}%</Text>
              <Text style={styles.conf}>{c.approved ? 'APPROVED BY YOU' : 'SUGGESTED'}</Text>
            </View>
          </View>
        ))}
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
  sub: { fontSize: 9, letterSpacing: 2, color: '#0A0A0A', opacity: 0.5, fontWeight: '700', marginTop: 2 },
  emptyBox: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyH: { fontSize: 18, fontWeight: '800', color: '#0A0A0A', marginTop: 14 },
  emptyP: { fontSize: 13.5, color: '#1D1D1F', opacity: 0.6, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  cta: { marginTop: 20, backgroundColor: '#0A0A0A', paddingVertical: 15, paddingHorizontal: 28, borderRadius: 999 },
  ctaText: { color: '#FFFFFF', fontWeight: '700', letterSpacing: 2, fontSize: 12 },
  card: {
    marginTop: 14, padding: 18, borderRadius: 20, backgroundColor: '#F5F5F7',
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.07)',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: theme.color.energy },
  cardKicker: { fontSize: 10, letterSpacing: 2.5, fontWeight: '800', color: '#0A0A0A', opacity: 0.6, flex: 1 },
  cardTime: { fontSize: 11, color: '#1D1D1F', opacity: 0.5, fontWeight: '600' },
  flowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  flowTargets: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  flowPill: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.1)',
  },
  flowPillText: { fontSize: 11, fontWeight: '700', color: '#0A0A0A' },
  signalSummary: { marginTop: 10, fontSize: 13.5, color: '#0A0A0A', fontWeight: '600', lineHeight: 19 },
  divider: { height: 1, backgroundColor: 'rgba(10,10,10,0.08)', marginVertical: 14 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  dot: { width: 8, height: 8, borderRadius: 999, marginTop: 5 },
  actionTitle: { fontSize: 14, fontWeight: '800', color: '#0A0A0A' },
  actionDetail: { fontSize: 12.5, color: '#1D1D1F', opacity: 0.65, marginTop: 2, lineHeight: 18 },
  confRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  conf: { fontSize: 9, letterSpacing: 1.5, fontWeight: '800', color: '#0A0A0A', opacity: 0.45 },
});
