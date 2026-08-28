import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Canvas, Circle, Line, vec, BlurMask } from '@shopify/react-native-skia';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/src/auth';
import { theme, PORTAL_IDS, portalMeta } from '@/src/theme';
import { Walkthrough } from '@/src/walkthrough';

const SW = Dimensions.get('window').width;
const RADIAL_H = Math.min(SW * 1.02, 430);
const NODE = 62;
const CX = SW / 2;
const CY = RADIAL_H / 2;
const RADIUS = Math.min(SW * 0.4, 168);

const PORTAL_ICONS: Record<string, any> = {
  creativity: 'color-palette-outline',
  work: 'briefcase-outline',
  home: 'home-outline',
  wellbeing: 'pulse-outline',
  relationships: 'people-outline',
  community: 'globe-outline',
  style: 'shirt-outline',
};

const COMPANION_NAMES: Record<string, string> = { guardian: 'Guardian', kaia: 'Kaia', atlas: 'Atlas' };

const positions = PORTAL_IDS.map((id, i) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / 7;
  return { id, x: CX + RADIUS * Math.cos(a), y: CY + RADIUS * Math.sin(a) };
});

function posOf(id: string) {
  return positions.find((p) => p.id === id)!;
}

export default function Hub() {
  const router = useRouter();
  const { user, loading, api, patchProfile } = useAuth();
  const [signals, setSignals] = useState<any[]>([]);
  const [paused, setPaused] = useState(false);
  const [tour, setTour] = useState(false);

  const pulse = useSharedValue(1);
  const linePulse = useSharedValue(0.5);

  useFocusEffect(
    useCallback(() => {
      if (!loading && !user) {
        router.replace('/landing');
        return;
      }
      pulse.value = withRepeat(withTiming(1.06, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true);
      linePulse.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }), -1, true);
      if (user) AsyncStorage.getItem('staar_tour_done').then((v) => { if (!v) setTour(true); });
      (async () => {
        try {
          const r = await api('/api/guardian/signals');
          if (r.ok) {
            const data = await r.json();
            setSignals(data.signals || []);
            setPaused(!!data.paused);
          }
        } catch {}
      })();
    }, [user, loading])
  );

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const lineStyle = useAnimatedStyle(() => ({ opacity: 0.35 + linePulse.value * 0.65 }));

  const activeLines: { from: { x: number; y: number }; to: { x: number; y: number } }[] = [];
  for (const s of signals) {
    const from = posOf(s.sourcePortal);
    if (!from) continue;
    for (const t of s.suggestedTargets || []) {
      const to = posOf(t);
      if (to) activeLines.push({ from, to });
    }
  }

  const cycleCompanion = async () => {
    if (!user) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const order = ['guardian', 'kaia', 'atlas'];
    const next = order[(order.indexOf(user.companion) + 1) % 3] as any;
    await patchProfile({ companion: next });
  };

  const openPortal = (id: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (id === 'work') router.push('/work');
    else router.push(`/portal/${id}`);
  };

  const topSignal = signals[0];

  return (
    <SafeAreaView style={styles.root} edges={['top']} testID="hub-root">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>STAAR HUB</Text>
            <Text style={styles.sub}>
              {user?.is_demo ? 'DEMO MODE · ' : ''}
              {signals.length > 0 ? `${signals.length} CROSS-LIFE SIGNAL${signals.length > 1 ? 'S' : ''}` : 'ALL PORTALS CALM'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={styles.companionPill} onPress={cycleCompanion} testID="companion-switcher">
              <Ionicons name="sparkles-outline" size={13} color="#0A0A0A" />
              <Text style={styles.companionText}>{COMPANION_NAMES[user?.companion || 'guardian']}</Text>
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => router.push('/settings')} testID="settings-btn">
              <Ionicons name="settings-outline" size={18} color="#0A0A0A" />
            </Pressable>
          </View>
        </View>

        {/* Radial hub */}
        <View style={{ width: SW, height: RADIAL_H }}>
          {/* Base connective lines */}
          <Canvas style={StyleSheet.absoluteFill}>
            {positions.map((p) => (
              <Line key={p.id} p1={vec(CX, CY)} p2={vec(p.x, p.y)} color="rgba(10,10,10,0.07)" strokeWidth={1} />
            ))}
            <Circle cx={CX} cy={CY} r={RADIUS} color="rgba(10,10,10,0.05)" style="stroke" strokeWidth={1} />
          </Canvas>

          {/* Active cross-life energy lines */}
          {activeLines.length > 0 && (
            <Animated.View style={[StyleSheet.absoluteFill, lineStyle]} pointerEvents="none">
              <Canvas style={StyleSheet.absoluteFill}>
                {activeLines.map((l, i) => (
                  <Line key={i} p1={vec(l.from.x, l.from.y)} p2={vec(l.to.x, l.to.y)} color={theme.color.energy} strokeWidth={2}>
                    <BlurMask blur={4} style="solid" />
                  </Line>
                ))}
              </Canvas>
            </Animated.View>
          )}

          {/* Guardian orb */}
          <Animated.View style={[styles.orbWrap, orbStyle, { left: CX - 70, top: CY - 70 }]}>
            <Canvas style={{ width: 140, height: 140 }}>
              <Circle cx={70} cy={70} r={54} color={theme.color.energy} opacity={0.4}>
                <BlurMask blur={30} style="normal" />
              </Circle>
              <Circle cx={70} cy={70} r={46} color={theme.color.gold} opacity={0.22}>
                <BlurMask blur={18} style="normal" />
              </Circle>
              <Circle cx={70} cy={70} r={40} color="#FFFFFF" />
              <Circle cx={70} cy={70} r={40} color="rgba(10,10,10,0.1)" style="stroke" strokeWidth={1} />
            </Canvas>
            <Pressable
              style={styles.orbPress}
              testID="guardian-orb"
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                router.push('/chat');
              }}
            >
              <Ionicons name="flash" size={22} color="#0A0A0A" />
              <Text style={styles.orbLabel}>{COMPANION_NAMES[user?.companion || 'guardian'].toUpperCase()}</Text>
            </Pressable>
          </Animated.View>

          {/* Portal nodes */}
          {positions.map((p) => {
            const meta = portalMeta[p.id];
            const isSource = signals.some((s) => s.sourcePortal === p.id);
            return (
              <View key={p.id} style={[styles.nodeWrap, { left: p.x - NODE / 2, top: p.y - NODE / 2 }]}>
                <Pressable onPress={() => openPortal(p.id)} testID={`portal-node-${p.id}`}>
                  <BlurView intensity={40} tint="light" style={[styles.node, isSource && styles.nodeActive]}>
                    <Ionicons name={PORTAL_ICONS[p.id]} size={20} color="#0A0A0A" />
                  </BlurView>
                  {isSource && <View style={styles.nodeDot} />}
                </Pressable>
                <Text style={styles.nodeLabel}>{meta.name}</Text>
              </View>
            );
          })}
        </View>

        {/* Guardian signal banner */}
        {paused ? (
          <View style={styles.banner}>
            <Text style={styles.bannerKicker}>CROSS-LIFE PAUSED</Text>
            <Text style={styles.bannerText}>The Guardian is not connecting context between portals right now. Resume anytime in Settings.</Text>
          </View>
        ) : topSignal ? (
          <Pressable style={styles.banner} onPress={() => openPortal(topSignal.sourcePortal)} testID="signal-banner">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.liveDot} />
              <Text style={styles.bannerKicker}>THE GUARDIAN NOTICED</Text>
            </View>
            <Text style={styles.bannerText}>{topSignal.summary}</Text>
            <View style={styles.bannerRow}>
              <Text style={styles.bannerMeta}>
                {portalMeta[topSignal.sourcePortal]?.name} → {(topSignal.suggestedTargets || []).map((t: string) => portalMeta[t]?.name).join(', ')}
              </Text>
              <Text style={styles.bannerCta}>OPEN →</Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.banner}>
            <Text style={styles.bannerKicker}>ALL CLEAR</Text>
            <Text style={styles.bannerText}>Nothing needs cross-life coordination right now.</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.primaryBtn} onPress={() => router.push('/chat')} testID="talk-guardian-btn">
            <Text style={styles.primaryBtnText}>TALK TO {COMPANION_NAMES[user?.companion || 'guardian'].toUpperCase()}</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => router.push('/guardian-view')} testID="guardian-view-btn">
            <Text style={styles.secondaryBtnText}>GUARDIAN VIEW</Text>
          </Pressable>
        </View>
      </ScrollView>

      {tour && (
        <Walkthrough
          onDone={() => {
            AsyncStorage.setItem('staar_tour_done', '1');
            setTour(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  brand: { fontSize: 15, fontWeight: '800', letterSpacing: 4, color: '#0A0A0A' },
  sub: { fontSize: 10, letterSpacing: 2, color: '#0A0A0A', opacity: 0.5, marginTop: 3, fontWeight: '600' },
  companionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.14)', backgroundColor: '#F5F5F7',
  },
  companionText: { fontSize: 12, fontWeight: '700', color: '#0A0A0A', letterSpacing: 0.5 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.14)', backgroundColor: '#FFFFFF',
  },
  orbWrap: { position: 'absolute', width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  orbPress: { position: 'absolute', width: 84, height: 84, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  orbLabel: { fontSize: 8, letterSpacing: 2, fontWeight: '800', color: '#0A0A0A', marginTop: 3 },
  nodeWrap: { position: 'absolute', width: NODE, alignItems: 'center' },
  node: {
    width: NODE, height: NODE, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.12)', backgroundColor: 'rgba(255,255,255,0.72)',
  },
  nodeActive: { borderColor: theme.color.energy, borderWidth: 1.5 },
  nodeDot: {
    position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 999,
    backgroundColor: theme.color.energy, borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  nodeLabel: { marginTop: 6, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: '#0A0A0A', opacity: 0.75 },
  banner: {
    marginHorizontal: 24, marginTop: 8, padding: 18, borderRadius: 20,
    backgroundColor: '#F5F5F7', borderWidth: 1, borderColor: 'rgba(10,10,10,0.08)',
  },
  liveDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: theme.color.energy },
  bannerKicker: { fontSize: 10, letterSpacing: 2.5, fontWeight: '800', color: '#0A0A0A', opacity: 0.6 },
  bannerText: { marginTop: 8, fontSize: 15, lineHeight: 21, color: '#0A0A0A', fontWeight: '600' },
  bannerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  bannerMeta: { fontSize: 11, color: '#1D1D1F', opacity: 0.6, fontWeight: '600', flex: 1 },
  bannerCta: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, color: '#0A0A0A' },
  actions: { paddingHorizontal: 24, marginTop: 16, gap: 10 },
  primaryBtn: {
    backgroundColor: '#0A0A0A', paddingVertical: 17, borderRadius: 999, alignItems: 'center',
    shadowColor: '#D4AF37', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 5 },
  },
  primaryBtnText: { color: '#FFFFFF', letterSpacing: 3, fontWeight: '700', fontSize: 12 },
  secondaryBtn: {
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.16)', paddingVertical: 15, borderRadius: 999, alignItems: 'center', backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: { color: '#0A0A0A', fontWeight: '700', letterSpacing: 2.5, fontSize: 12 },
});
