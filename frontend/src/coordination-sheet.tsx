import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/src/auth';
import { portalMeta } from '@/src/theme';
import { playVoice, stopVoice } from '@/src/voice';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || '';

type Props = {
  visible: boolean;
  onClose: () => void;
  coord: { coordination_id?: string; actions?: any[] } | null;
  headline: string;
  sub: string;
};

export function CoordinationSheet({ visible, onClose, coord, headline, sub }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { api } = useAuth();
  const [voice, setVoice] = useState<'idle' | 'loading' | 'playing'>('idle');

  const close = () => {
    stopVoice();
    setVoice('idle');
    onClose();
  };

  const speak = async () => {
    if (voice === 'playing') {
      stopVoice();
      setVoice('idle');
      return;
    }
    if (!coord?.coordination_id || voice === 'loading') return;
    setVoice('loading');
    try {
      const r = await api('/api/guardian/speak', {
        method: 'POST',
        body: JSON.stringify({ coordination_id: coord.coordination_id }),
      });
      if (!r.ok) { setVoice('idle'); return; }
      const { url } = await r.json();
      const p = await playVoice(`${BACKEND}${url}`);
      setVoice('playing');
      const sub2 = p.addListener('playbackStatusUpdate', (st: any) => {
        if (st?.didJustFinish) {
          setVoice('idle');
          sub2.remove();
        }
      });
    } catch {
      setVoice('idle');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.scrim}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.grabber} />
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
            <Text style={styles.kicker}>CROSS-LIFE INTELLIGENCE</Text>
            <Text style={styles.h}>{headline}</Text>
            <Text style={styles.sub}>{sub}</Text>

            <Text style={styles.sheetNote} testID="simulated-note">DEMO · SIMULATED — no external services, devices or bookings were actually triggered.</Text>

            <Pressable
          accessibilityRole="button"
              style={[styles.voiceBtn, voice === 'playing' && styles.voiceBtnActive]}
              onPress={speak}
              testID="hear-guardian-btn"
            >
              {voice === 'loading' ? (
                <ActivityIndicator size="small" color="#00E5FF" />
              ) : (
                <Ionicons name={voice === 'playing' ? 'stop' : 'volume-high'} size={16} color="#00E5FF" />
              )}
              <Text style={styles.voiceText}>
                {voice === 'loading' ? 'PREPARING VOICE…' : voice === 'playing' ? 'SPEAKING — TAP TO STOP' : 'HEAR THE GUARDIAN'}
              </Text>
            </Pressable>

            {(coord?.actions || []).map((a: any, i: number) => {
              const meta = portalMeta[a.portal];
              return (
                <Animated.View key={i} entering={FadeInDown.delay(i * 120).duration(400)} style={styles.actionCard} testID={`action-${a.portal}`}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.dot, { backgroundColor: meta?.accent || '#0A0A0A' }]} />
                    <Text style={[styles.actionPortal, { flex: 1 }]}>{meta?.name?.toUpperCase() || a.portal.toUpperCase()}</Text>
                    <View style={styles.simPill}><Text style={styles.simPillText}>SIMULATED</Text></View>
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
          accessibilityRole="button"
            style={styles.cta}
            onPress={() => { close(); router.push('/guardian-view'); }}
            testID="open-guardian-view-btn"
          >
            <Text style={styles.ctaText}>OPEN GUARDIAN VIEW</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={{ alignItems: 'center', paddingVertical: 14 }} onPress={close} testID="close-modal-btn">
            <Text style={styles.closeText}>CLOSE</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#101218', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 10,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    width: '100%', maxWidth: 640, alignSelf: 'center',
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 14 },
  kicker: { fontSize: 10, letterSpacing: 3, fontWeight: '800', color: '#00E5FF' },
  h: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginTop: 6 },
  sub: { fontSize: 13.5, color: '#9CA3AF', marginTop: 4, marginBottom: 8 },
  sheetNote: { fontSize: 10, letterSpacing: 1, color: '#8A93A3', marginBottom: 12, lineHeight: 15, fontWeight: '600' },
  simPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(255,214,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,214,0,0.3)' },
  simPillText: { fontSize: 7.5, letterSpacing: 1, fontWeight: '800', color: '#FFD600' },
  voiceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.45)', backgroundColor: 'rgba(0,51,61,0.5)',
    paddingVertical: 13, borderRadius: 999, marginBottom: 14,
  },
  voiceBtnActive: { borderColor: 'rgba(29,233,182,0.7)', backgroundColor: 'rgba(0,80,60,0.35)' },
  voiceText: { fontSize: 11, fontWeight: '800', letterSpacing: 2, color: '#F3F4F6' },
  actionCard: {
    padding: 16, borderRadius: 18, backgroundColor: '#1A1D24', marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  dot: { width: 8, height: 8, borderRadius: 999 },
  actionPortal: { fontSize: 10, letterSpacing: 2, fontWeight: '800', color: '#9CA3AF' },
  actionTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginTop: 6 },
  actionDetail: { fontSize: 13, color: '#D1D5DB', opacity: 0.8, marginTop: 4, lineHeight: 19 },
  itemsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  itemChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: '#0F1116',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  itemChipText: { fontSize: 11, fontWeight: '600', color: '#D1D5DB' },
  cta: {
    backgroundColor: '#00E5FF', paddingVertical: 16, borderRadius: 999, alignItems: 'center',
    shadowColor: '#00E5FF', shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  ctaText: { color: '#000000', fontWeight: '800', letterSpacing: 2.5, fontSize: 12 },
  closeText: { fontWeight: '700', letterSpacing: 2, fontSize: 12, color: '#9CA3AF' },
});
