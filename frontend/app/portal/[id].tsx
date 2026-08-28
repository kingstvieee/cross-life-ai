import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect, Redirect } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useAuth } from '@/src/auth';
import { theme, portalMeta } from '@/src/theme';

export default function PortalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { api } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [ideaText, setIdeaText] = useState('');

  const meta = portalMeta[id || ''];

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await api(`/api/portal/${id}/state`);
      if (r.ok) setData((await r.json()).data);
      if (id === 'community') {
        const re = await api('/api/community/events');
        if (re.ok) setEvents(await re.json());
      }
    } catch {}
  }, [api, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async (next: any) => {
    setData(next);
    await api(`/api/portal/${id}/state`, { method: 'POST', body: JSON.stringify({ data: next }) });
  };

  if (id === 'work') return <Redirect href="/work" />;
  if (!meta) return <Redirect href="/hub" />;

  return (
    <View style={styles.root} testID={`portal-root-${id}`}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Cinematic header */}
        <View style={styles.hero}>
          <Image source={{ uri: meta.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.8)', '#FFFFFF']} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['top']} style={styles.heroInner}>
            <Pressable style={styles.backBtn} onPress={() => router.back()} testID="back-btn">
              <Ionicons name="chevron-back" size={20} color="#0A0A0A" />
            </Pressable>
          </SafeAreaView>
          <View style={styles.heroBottom}>
            <Text style={styles.kicker}>PORTAL</Text>
            <Text style={styles.title}>{meta.name}</Text>
            <Text style={styles.tagline}>{meta.tagline}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 24 }}>
          {id === 'wellbeing' && <Wellbeing data={data} save={save} />}
          {id === 'home' && <Home data={data} save={save} />}
          {id === 'community' && <Community data={data} save={save} events={events} />}
          {id === 'style' && <Style data={data} />}
          {id === 'relationships' && <Relationships data={data} />}
          {id === 'creativity' && (
            <Creativity data={data} save={save} ideaText={ideaText} setIdeaText={setIdeaText} />
          )}

          <Pressable style={styles.askBtn} onPress={() => router.push({ pathname: '/chat', params: { portal: id } })} testID="ask-guardian-btn">
            <Ionicons name="flash" size={14} color="#FFFFFF" />
            <Text style={styles.askText}>ASK THE GUARDIAN</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionH({ children }: { children: string }) {
  return <Text style={styles.sectionH}>{children}</Text>;
}

function Wellbeing({ data, save }: any) {
  const active = !!data?.decompression_active;
  const breath = useSharedValue(1);
  useEffect(() => {
    if (active) breath.value = withRepeat(withTiming(1.35, { duration: 4000, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [active]);
  const breathStyle = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }] }));

  return (
    <View>
      <View style={styles.metricRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>MOOD</Text>
          <Text style={styles.metricValue}>{data?.mood ?? '—'}/5</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>STRESS</Text>
          <Text style={[styles.metricValue, (data?.stress || 0) >= 6 && { color: '#8B0000' }]}>{data?.stress ?? '—'}/10</Text>
        </View>
      </View>

      {active ? (
        <View style={styles.breathCard} testID="decompression-card">
          <Text style={styles.gKicker}>DECOMPRESSION ACTIVE</Text>
          <View style={{ alignItems: 'center', paddingVertical: 26 }}>
            <Animated.View style={[styles.breathCircle, breathStyle]} />
            <Text style={styles.breathText}>Box breathing · 4-4-4-4</Text>
            <Text style={styles.breathSub}>Notifications muted. Interface softened. The Guardian set this up after your Work signal.</Text>
          </View>
          <Pressable
            style={styles.outlineBtn}
            onPress={() => save({ ...data, decompression_active: false })}
            testID="end-session-btn"
          >
            <Text style={styles.outlineBtnText}>END SESSION</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={styles.blackBtn}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            save({ ...data, decompression_active: true, last_break: new Date().toISOString() });
          }}
          testID="start-decompression-btn"
        >
          <Text style={styles.blackBtnText}>START 20-MIN DECOMPRESSION</Text>
        </Pressable>
      )}
    </View>
  );
}

function Home({ data, save }: any) {
  const lights = data?.lights || 'auto';
  const temp = data?.temperature ?? 21;
  const reminders = data?.reminders || [];
  const cycleLights = () => {
    const order = ['auto', 'warm', 'off'];
    save({ ...data, lights: order[(order.indexOf(lights) + 1) % 3] });
  };
  return (
    <View>
      {data?.routine_started && (
        <View style={styles.infoCard} testID="routine-card">
          <Text style={styles.gKicker}>EVENING ROUTINE · RUNNING</Text>
          <Text style={styles.infoText}>The Guardian started your evening routine. Lights warm at 7:00 PM, thermostat easing to 20°C.</Text>
        </View>
      )}
      <SectionH>CONTROLS</SectionH>
      <View style={styles.metricRow}>
        <Pressable style={styles.metricCard} onPress={cycleLights} testID="lights-control">
          <Text style={styles.metricLabel}>LIGHTS</Text>
          <Text style={styles.metricValue}>{String(lights).toUpperCase()}</Text>
        </Pressable>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>TEMP</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable onPress={() => save({ ...data, temperature: temp - 1 })} testID="temp-down"><Text style={styles.stepper}>−</Text></Pressable>
            <Text style={styles.metricValue}>{temp}°</Text>
            <Pressable onPress={() => save({ ...data, temperature: temp + 1 })} testID="temp-up"><Text style={styles.stepper}>+</Text></Pressable>
          </View>
        </View>
      </View>
      <SectionH>REMINDERS</SectionH>
      {reminders.length === 0 && <Text style={styles.empty}>Nothing pending at home.</Text>}
      {reminders.map((r: any) => (
        <View key={r.id} style={styles.rowCard}>
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#0A0A0A' }}>{r.text}</Text>
          <Pressable onPress={() => save({ ...data, reminders: reminders.filter((x: any) => x.id !== r.id) })} testID={`clear-${r.id}`}>
            <Ionicons name="close" size={18} color="#0A0A0A" style={{ opacity: 0.5 }} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function Community({ data, save, events }: any) {
  const rsvp = data?.rsvp || [];
  return (
    <View>
      <SectionH>TORONTO · THIS WEEK</SectionH>
      {events.map((e: any) => {
        const going = rsvp.includes(e.id);
        return (
          <View key={e.id} style={styles.eventCard} testID={`event-${e.id}`}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eventTitle}>{e.title}</Text>
              <Text style={styles.eventMeta}>{e.date} · {e.time} · {e.location}</Text>
              <Text style={styles.eventMeta}>Dress: {e.dress_code} · Weather: {e.weather}</Text>
            </View>
            <Pressable
              style={[styles.rsvpBtn, going && { backgroundColor: '#0A0A0A' }]}
              onPress={() => save({ ...data, rsvp: going ? rsvp.filter((x: string) => x !== e.id) : [...rsvp, e.id] })}
              testID={`rsvp-${e.id}`}
            >
              <Text style={[styles.rsvpText, going && { color: '#FFFFFF' }]}>{going ? 'GOING' : 'RSVP'}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function Style({ data }: any) {
  const outfit = data?.planned_outfit;
  return (
    <View>
      <SectionH>TONIGHT</SectionH>
      {outfit ? (
        <View style={styles.infoCard} testID="outfit-card">
          <Text style={styles.gKicker}>PREPARED BY THE GUARDIAN</Text>
          <Text style={[styles.infoText, { fontWeight: '800', fontSize: 16 }]}>{outfit.name}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {(outfit.items || []).map((it: string, i: number) => (
              <View key={i} style={styles.chip}><Text style={styles.chipText}>{it}</Text></View>
            ))}
          </View>
        </View>
      ) : (
        <Text style={styles.empty}>No outfit planned yet. When the Guardian coordinates an evening with an event, it prepares one here.</Text>
      )}
    </View>
  );
}

function Relationships({ data }: any) {
  const checkins = data?.checkins || [];
  return (
    <View>
      <SectionH>CHECK-INS</SectionH>
      {checkins.length === 0 && <Text style={styles.empty}>No one on your mind logged yet.</Text>}
      {checkins.map((c: any) => (
        <View key={c.id} style={styles.rowCard}>
          <View style={styles.avatar}><Text style={{ fontWeight: '800', color: '#0A0A0A' }}>{c.name?.[0]}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14.5, fontWeight: '700', color: '#0A0A0A' }}>{c.name}</Text>
            <Text style={{ fontSize: 12.5, color: '#1D1D1F', opacity: 0.6, marginTop: 2 }}>{c.note}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function Creativity({ data, save, ideaText, setIdeaText }: any) {
  const ideas = data?.ideas || [];
  const addIdea = () => {
    if (!ideaText.trim()) return;
    save({ ...data, ideas: [...ideas, { id: `i_${Date.now()}`, text: ideaText.trim() }] });
    setIdeaText('');
  };
  return (
    <View>
      <SectionH>IDEAS</SectionH>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={ideaText}
          onChangeText={setIdeaText}
          placeholder="Capture an idea…"
          placeholderTextColor="rgba(10,10,10,0.35)"
          testID="idea-input"
        />
        <Pressable style={styles.addBtn} onPress={addIdea} testID="add-idea-btn">
          <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
      {ideas.map((i: any) => (
        <View key={i.id} style={styles.rowCard}>
          <Ionicons name="bulb-outline" size={16} color="#0A0A0A" style={{ opacity: 0.55 }} />
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#0A0A0A' }}>{i.text}</Text>
        </View>
      ))}
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
  sectionH: { marginTop: 24, marginBottom: 10, fontSize: 11, letterSpacing: 3, fontWeight: '800', color: '#0A0A0A', opacity: 0.55 },
  empty: { fontSize: 14, color: '#1D1D1F', opacity: 0.55, lineHeight: 20 },
  metricRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  metricCard: {
    flex: 1, padding: 16, borderRadius: 18, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.1)',
  },
  metricLabel: { fontSize: 9, letterSpacing: 2, fontWeight: '800', color: '#0A0A0A', opacity: 0.5 },
  metricValue: { fontSize: 24, fontWeight: '800', color: '#0A0A0A', marginTop: 6 },
  stepper: { fontSize: 22, fontWeight: '700', color: '#0A0A0A', paddingHorizontal: 4, marginTop: 6 },
  breathCard: {
    marginTop: 16, padding: 20, borderRadius: 20, backgroundColor: '#F5F5F7',
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.35)',
  },
  gKicker: { fontSize: 10, letterSpacing: 2.5, fontWeight: '800', color: '#0A0A0A', opacity: 0.65 },
  breathCircle: {
    width: 90, height: 90, borderRadius: 999, backgroundColor: 'rgba(0,229,255,0.18)',
    borderWidth: 1.5, borderColor: theme.color.energy, marginBottom: 18,
  },
  breathText: { fontSize: 16, fontWeight: '800', color: '#0A0A0A' },
  breathSub: { fontSize: 12.5, color: '#1D1D1F', opacity: 0.6, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  blackBtn: {
    marginTop: 16, backgroundColor: '#0A0A0A', paddingVertical: 16, borderRadius: 999, alignItems: 'center',
    shadowColor: '#D4AF37', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 5 },
  },
  blackBtnText: { color: '#FFFFFF', fontWeight: '700', letterSpacing: 2.5, fontSize: 12 },
  outlineBtn: {
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.16)', paddingVertical: 13, borderRadius: 999,
    alignItems: 'center', backgroundColor: '#FFFFFF',
  },
  outlineBtnText: { color: '#0A0A0A', fontWeight: '700', letterSpacing: 2, fontSize: 11 },
  infoCard: {
    marginTop: 16, padding: 18, borderRadius: 20, backgroundColor: '#F5F5F7',
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.07)',
  },
  infoText: { marginTop: 8, fontSize: 14, color: '#0A0A0A', fontWeight: '500', lineHeight: 20 },
  rowCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderRadius: 16, marginBottom: 10,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(10,10,10,0.09)',
  },
  avatar: {
    width: 38, height: 38, borderRadius: 999, backgroundColor: '#F5F5F7',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(10,10,10,0.1)',
  },
  eventCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, marginBottom: 10,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(10,10,10,0.09)',
  },
  eventTitle: { fontSize: 15, fontWeight: '800', color: '#0A0A0A' },
  eventMeta: { fontSize: 12, color: '#1D1D1F', opacity: 0.6, marginTop: 2 },
  rsvpBtn: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.2)', backgroundColor: '#FFFFFF',
  },
  rsvpText: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#0A0A0A' },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.1)',
  },
  chipText: { fontSize: 11, fontWeight: '600', color: '#0A0A0A' },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 14 },
  input: {
    flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(10,10,10,0.12)',
    paddingHorizontal: 14, fontSize: 14, color: '#0A0A0A', backgroundColor: '#FFFFFF',
  },
  addBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },
  askBtn: {
    marginTop: 28, flexDirection: 'row', gap: 8, backgroundColor: '#0A0A0A', paddingVertical: 16,
    borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#D4AF37', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 5 },
  },
  askText: { color: '#FFFFFF', fontWeight: '700', letterSpacing: 2.5, fontSize: 12 },
});
