import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuth } from '@/src/auth';
import { IMG } from '@/src/theme';

WebBrowser.maybeCompleteAuthSession();

export default function Landing() {
  const router = useRouter();
  const { loginDemo, exchangeSessionId } = useAuth();
  const [busy, setBusy] = useState<null | 'demo' | 'google'>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const initial = await Linking.getInitialURL();
      if (initial) tryConsume(initial);
    })();
    const sub = Linking.addEventListener('url', (ev) => tryConsume(ev.url));
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const raw = window.location.href;
      if (/[?#&]session_id=/.test(raw)) tryConsume(raw);
    }
    return () => sub.remove();
  }, []);

  async function tryConsume(rawUrl: string) {
    const m = rawUrl.match(/[?#&]session_id=([^&#]+)/);
    if (!m) return;
    const sid = decodeURIComponent(m[1]);
    if (seen.has(sid)) return;
    setSeen((s) => new Set(s).add(sid));
    const u = await exchangeSessionId(sid);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('session_id');
      url.hash = '';
      window.history.replaceState(window.history.state, '', url.toString());
    }
    if (u) router.replace(u.onboarding_complete ? '/hub' : '/onboarding');
  }

  const doDemo = async () => {
    setBusy('demo');
    const u = await loginDemo();
    setBusy(null);
    if (u) router.replace('/hub');
  };

  const doGoogle = async () => {
    setBusy('google');
    const redirectUrl = Platform.OS === 'web'
      ? window.location.origin + '/'
      : Linking.createURL('');
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    if (Platform.OS === 'web') {
      window.location.href = authUrl;
      return;
    }
    try {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      if ((result as any).url) await tryConsume((result as any).url);
      else {
        const cold = await Linking.getInitialURL();
        if (cold) await tryConsume(cold);
      }
    } catch (e) {}
    setBusy(null);
  };

  return (
    <View style={styles.root} testID="landing-root">
      {/* Cinematic hero */}
      <View style={styles.hero}>
        <Image source={{ uri: IMG.toronto }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
        <LinearGradient
          colors={['rgba(10,11,14,0.25)', 'rgba(10,11,14,0.35)', 'rgba(10,11,14,0.85)', '#0A0B0E']}
          locations={[0, 0.45, 0.8, 1]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView edges={['top']} style={styles.heroInner}>
          <Text style={styles.brand}>STAARWAARDD</Text>
          <Text style={styles.tag}>STAAR HUB • CROSS-LIFE CONTEXT INTELLIGENCE</Text>
        </SafeAreaView>
        <View style={styles.heroBottom}>
          <Text style={styles.h1}>YOUR LIFE IS CONNECTED.</Text>
          <Text style={[styles.h1, { color: '#00E5FF' }]}>YOUR AI SHOULD BE TOO.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.p}>
          STAAR Hub uses Cross-Life Context Intelligence to understand how Work, Home, Wellbeing,
          Relationships, Community, Creativity and Style affect one another — then coordinates them
          through one intelligent environment.
        </Text>

        <View style={styles.ctaGroup}>
          <Pressable style={styles.primaryCta} onPress={doDemo} disabled={!!busy} testID="experience-demo-btn">
            <Text style={styles.primaryCtaText}>{busy === 'demo' ? 'PREPARING…' : 'EXPERIENCE DEMO'}</Text>
          </Pressable>
          <Pressable style={styles.secondaryCta} onPress={doGoogle} disabled={!!busy} testID="google-signin-btn">
            <Text style={styles.secondaryCtaText}>{busy === 'google' ? 'OPENING…' : 'Sign in with Google'}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionKicker}>THE PROBLEM</Text>
          <Text style={styles.sectionH}>Seven apps. Zero context.</Text>
          <Text style={styles.p}>
            Calendars, task managers, wellness apps, smart-home apps, messaging, event apps, wardrobe apps.
            You are the integration layer between all of them. Not anymore.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionKicker}>THE GUARDIAN</Text>
          <Text style={styles.sectionH}>One intelligence. Seven portals.</Text>
          <View style={styles.portalGrid}>
            {['Creativity','Work','Home','Wellbeing','Relationships','Community','Style'].map((n) => (
              <View key={n} style={styles.portalPill}><Text style={styles.portalPillText}>{n}</Text></View>
            ))}
          </View>
        </View>

        <View style={[styles.section, styles.impact]}>
          <Text style={styles.impactH}>ONE PERSON.</Text>
          <Text style={styles.impactH}>ONE CONTEXT.</Text>
          <Text style={[styles.impactH, { color: '#00E5FF' }]}>SEVEN CONNECTED AREAS OF LIFE.</Text>
        </View>

        <Pressable style={styles.primaryCta} onPress={doDemo} testID="experience-demo-btn-bottom">
          <Text style={styles.primaryCtaText}>SEE CROSS-LIFE INTELLIGENCE</Text>
        </Pressable>
        <Text style={styles.foot}>Working Today · Future Capability clearly separated inside the Hub.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0B0E' },
  hero: { height: 400 },
  heroInner: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  brand: { fontSize: 12, letterSpacing: 6, color: '#FFFFFF', fontWeight: '800' },
  tag: { fontSize: 10, letterSpacing: 3, color: '#FFFFFF', opacity: 0.6, marginTop: 4 },
  heroBottom: { position: 'absolute', bottom: 18, left: 24, right: 24 },
  body: { paddingHorizontal: 24, paddingBottom: 60, paddingTop: 4 },
  h1: { fontSize: 28, letterSpacing: 1, color: '#FFFFFF', fontWeight: '800', lineHeight: 33 },
  p: { fontSize: 15, lineHeight: 22, color: '#D1D5DB', opacity: 0.85, marginTop: 12 },
  ctaGroup: { marginTop: 24, gap: 12 },
  primaryCta: {
    backgroundColor: '#00E5FF', paddingVertical: 18, borderRadius: 999, alignItems: 'center',
    shadowColor: '#00E5FF', shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  primaryCtaText: { color: '#000000', letterSpacing: 3, fontWeight: '800', fontSize: 13 },
  secondaryCta: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingVertical: 16, borderRadius: 999, alignItems: 'center',
    backgroundColor: 'rgba(21,23,29,0.6)',
  },
  secondaryCtaText: { color: '#FFFFFF', fontWeight: '600', letterSpacing: 1.5 },
  section: { marginTop: 40 },
  sectionKicker: { color: '#00E5FF', letterSpacing: 3, fontSize: 11, fontWeight: '800' },
  sectionH: { marginTop: 6, fontSize: 22, color: '#FFFFFF', fontWeight: '800' },
  portalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  portalPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: '#15171D',
  },
  portalPillText: { color: '#F3F4F6', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  impact: { paddingVertical: 20 },
  impactH: { fontSize: 20, letterSpacing: 2, fontWeight: '800', color: '#FFFFFF' },
  foot: { textAlign: 'center', marginTop: 18, fontSize: 11, color: '#9CA3AF', opacity: 0.7 },
});
