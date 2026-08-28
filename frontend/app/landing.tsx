import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Linking as RNLinking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuth } from '@/src/auth';
import { theme } from '@/src/theme';

WebBrowser.maybeCompleteAuthSession();

export default function Landing() {
  const router = useRouter();
  const { loginDemo, exchangeSessionId } = useAuth();
  const [busy, setBusy] = useState<null | 'demo' | 'google'>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Cold-start deep link handler (mobile)
    (async () => {
      const initial = await Linking.getInitialURL();
      if (initial) tryConsume(initial);
    })();
    const sub = Linking.addEventListener('url', (ev) => tryConsume(ev.url));
    // Web hash / query
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
      {/* Hero */}
      <View style={styles.hero}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1524168948265-8f79ad8d4e33?crop=entropy&cs=srgb&fm=jpg&q=85' }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.85)', '#FFFFFF']}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView edges={['top']} style={styles.heroInner}>
          <Text style={styles.brand}>STAARWAARDD</Text>
          <Text style={styles.tag}>STAAR HUB • CROSS-LIFE CONTEXT INTELLIGENCE</Text>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.h1}>YOUR LIFE IS CONNECTED.</Text>
        <Text style={[styles.h1, { color: theme.color.gold }]}>YOUR AI SHOULD BE TOO.</Text>
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
          <Text style={[styles.impactH, { color: theme.color.gold }]}>SEVEN CONNECTED AREAS OF LIFE.</Text>
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
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  hero: { height: 260, backgroundColor: '#EAF2FA' },
  heroInner: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  brand: { fontSize: 12, letterSpacing: 6, color: '#0A0A0A', fontWeight: '800' },
  tag: { fontSize: 10, letterSpacing: 3, color: '#0A0A0A', opacity: 0.55, marginTop: 4 },
  body: { paddingHorizontal: 24, paddingBottom: 60 },
  h1: { fontSize: 30, letterSpacing: 1, color: '#0A0A0A', fontWeight: '800', lineHeight: 34 },
  p: { fontSize: 15, lineHeight: 22, color: '#1D1D1F', opacity: 0.75, marginTop: 12 },
  ctaGroup: { marginTop: 24, gap: 12 },
  primaryCta: {
    backgroundColor: '#0A0A0A', paddingVertical: 18, borderRadius: 999, alignItems: 'center',
    shadowColor: '#D4AF37', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  primaryCtaText: { color: '#FFFFFF', letterSpacing: 3, fontWeight: '700', fontSize: 13 },
  secondaryCta: {
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.16)', paddingVertical: 16, borderRadius: 999, alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryCtaText: { color: '#0A0A0A', fontWeight: '600', letterSpacing: 1.5 },
  section: { marginTop: 40 },
  sectionKicker: { color: '#0A0A0A', opacity: 0.55, letterSpacing: 3, fontSize: 11, fontWeight: '700' },
  sectionH: { marginTop: 6, fontSize: 22, color: '#0A0A0A', fontWeight: '800' },
  portalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  portalPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(10,10,10,0.16)',
    backgroundColor: '#F5F5F7',
  },
  portalPillText: { color: '#0A0A0A', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  impact: { paddingVertical: 20 },
  impactH: { fontSize: 20, letterSpacing: 2, fontWeight: '800', color: '#0A0A0A' },
  foot: { textAlign: 'center', marginTop: 18, fontSize: 11, color: '#1D1D1F', opacity: 0.5 },
});
