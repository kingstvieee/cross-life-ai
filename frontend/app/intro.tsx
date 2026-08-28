import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withRepeat, withSequence, Easing, runOnJS,
} from 'react-native-reanimated';
import { Canvas, Rect, LinearGradient, vec, Path, Circle, BlurMask, Group, Skia } from '@shopify/react-native-skia';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, PORTAL_IDS, portalMeta } from '@/src/theme';

const { width: SW, height: SH } = Dimensions.get('window');

function PortalOrb({ pid, x, y, progress }: { pid: string; x: number; y: number; progress: Animated.SharedValue<number> }) {
  const meta = portalMeta[pid];
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.6 + progress.value * 0.4 }],
  }));
  return (
    <Animated.View style={[styles.portalOrb, { left: x, top: y, borderColor: meta.accent }, style]} pointerEvents="none">
      <Text style={[styles.portalOrbInitial, { color: meta.accent }]}>{meta.name[0]}</Text>
    </Animated.View>
  );
}

// CN Tower silhouette + Toronto skyline path (recognizable)
function torontoPath() {
  const p = Skia.Path.Make();
  const base = SH * 0.72;
  // Left buildings
  p.moveTo(0, base);
  p.lineTo(0, base - 40); p.lineTo(30, base - 40); p.lineTo(30, base - 80); p.lineTo(55, base - 80);
  p.lineTo(55, base - 60); p.lineTo(80, base - 60); p.lineTo(80, base - 100); p.lineTo(110, base - 100);
  p.lineTo(110, base - 70); p.lineTo(140, base - 70); p.lineTo(140, base - 120); p.lineTo(170, base - 120);
  p.lineTo(170, base - 90); p.lineTo(200, base - 90);
  // CN Tower — distinctive: tapered shaft, pod, antenna
  const cx = SW * 0.55;
  p.lineTo(cx - 40, base - 90);
  p.lineTo(cx - 12, base - 210); // shaft up
  p.lineTo(cx - 24, base - 220); // pod bottom-left
  p.lineTo(cx - 24, base - 250); // pod left
  p.lineTo(cx + 24, base - 250); // pod top
  p.lineTo(cx + 24, base - 220); // pod right
  p.lineTo(cx + 12, base - 210);
  p.lineTo(cx + 4, base - 320); // upper shaft
  p.lineTo(cx - 2, base - 380); // antenna base
  p.lineTo(cx, base - 460); // antenna tip
  p.lineTo(cx + 2, base - 380);
  p.lineTo(cx + 8, base - 320);
  p.lineTo(cx + 12, base - 210);
  p.lineTo(cx + 40, base - 90);
  // Right skyline
  p.lineTo(SW * 0.68, base - 90);
  p.lineTo(SW * 0.68, base - 140); p.lineTo(SW * 0.74, base - 140); p.lineTo(SW * 0.74, base - 90);
  p.lineTo(SW * 0.80, base - 90); p.lineTo(SW * 0.80, base - 160); p.lineTo(SW * 0.86, base - 160);
  p.lineTo(SW * 0.86, base - 110); p.lineTo(SW * 0.92, base - 110); p.lineTo(SW * 0.92, base - 70);
  p.lineTo(SW, base - 70); p.lineTo(SW, base);
  p.close();
  return p;
}

export default function Intro() {
  const router = useRouter();
  const [scene, setScene] = useState<'toronto' | 'boy' | 'arrival' | 'portals' | 'welcome'>('toronto');

  const skyFade = useSharedValue(0);
  const boyOpacity = useSharedValue(0);
  const guardianY = useSharedValue(-SH * 0.4);
  const guardianScale = useSharedValue(0.6);
  const guardianGlow = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const welcomeOpacity = useSharedValue(0);
  const portalOrbs = PORTAL_IDS.map(() => useSharedValue(0));

  useEffect(() => {
    skyFade.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) });
    boyOpacity.value = withDelay(1000, withTiming(1, { duration: 800 }));
    // Scene: boy
    setTimeout(() => setScene('boy'), 1500);
    // Scene: arrival
    setTimeout(() => {
      setScene('arrival');
      flashOpacity.value = withSequence(
        withTiming(0.9, { duration: 300 }),
        withTiming(0, { duration: 500 }),
      );
      guardianY.value = withTiming(SH * 0.32, { duration: 1200, easing: Easing.out(Easing.cubic) });
      guardianScale.value = withTiming(1, { duration: 1200 });
      guardianGlow.value = withRepeat(withTiming(1, { duration: 1400 }), -1, true);
    }, 3200);
    // Portals reveal one by one
    setTimeout(() => {
      setScene('portals');
      portalOrbs.forEach((v, i) => {
        v.value = withDelay(i * 260, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
      });
    }, 5000);
    // Welcome
    setTimeout(() => {
      setScene('welcome');
      welcomeOpacity.value = withTiming(1, { duration: 700 });
    }, 7500);
  }, []);

  const guardianStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: guardianY.value }, { scale: guardianScale.value }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const welcomeStyle = useAnimatedStyle(() => ({ opacity: welcomeOpacity.value }));
  const boyStyle = useAnimatedStyle(() => ({ opacity: boyOpacity.value }));

  const skyline = torontoPath();

  const skip = () => router.replace('/landing');

  // Portal ring positions
  const cx = SW / 2;
  const cy = SH * 0.55;
  const radius = Math.min(SW * 0.36, 150);

  return (
    <View style={styles.root} testID="intro-root">
      {/* Sky — luminous night */}
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={SW} height={SH}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, SH)}
            colors={['#EAF2FA', '#F7F6F1', '#FFFFFF', '#E9EEF3']}
          />
        </Rect>
        {/* Distant glow behind CN tower */}
        <Circle cx={SW * 0.55} cy={SH * 0.35} r={140} color={'#B7E3F3'} opacity={0.55}>
          <BlurMask blur={60} style="normal" />
        </Circle>
        {/* Skyline silhouette */}
        <Group opacity={0.92}>
          <Path path={skyline} color={'#0A0A0A'} />
        </Group>
        {/* Ground light reflection */}
        <Rect x={0} y={SH * 0.72} width={SW} height={SH * 0.28}>
          <LinearGradient start={vec(0, 0)} end={vec(0, SH * 0.28)} colors={['rgba(10,10,10,0.02)', 'rgba(10,10,10,0.12)']} />
        </Rect>
      </Canvas>

      {/* Boy silhouette */}
      <Animated.View style={[styles.boy, boyStyle]} pointerEvents="none">
        <View style={styles.boyBody} />
        <View style={styles.boyHead} />
      </Animated.View>

      {/* Guardian arrival flash */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }, flashStyle]} />

      {/* Guardian orb */}
      {(scene === 'arrival' || scene === 'portals' || scene === 'welcome') && (
        <Animated.View style={[styles.guardianWrap, guardianStyle]} pointerEvents="none">
          <View style={styles.guardianOuterGlow} />
          <ExpoGradient
            colors={['#FFFFFF', '#E7F6FC', '#7EDCF3', '#00E5FF']}
            style={styles.guardianOrb}
          />
          <View style={styles.guardianRing} />
          <View style={styles.guardianRing2} />
        </Animated.View>
      )}

      {/* Seven portals radial */}
      {PORTAL_IDS.map((pid, i) => {
        const angle = (Math.PI * 2 * i) / PORTAL_IDS.length - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius - 26;
        const y = cy + Math.sin(angle) * radius - 26;
        return <PortalOrb key={pid} pid={pid} x={x} y={y} progress={portalOrbs[i]} />;
      })}

      {/* Welcome overlay */}
      {scene === 'welcome' && (
        <Animated.View style={[styles.welcome, welcomeStyle]}>
          <SafeAreaView edges={['bottom']} style={{ width: '100%', alignItems: 'center' }}>
            <Text style={styles.welcomeTitle}>WELCOME TO STAAR HUB</Text>
            <Text style={styles.welcomeSub}>Your life isn't seven separate systems. Neither are we.</Text>
            <Pressable style={styles.cta} onPress={() => router.replace('/landing')} testID="enter-hub-btn">
              <Text style={styles.ctaText}>ENTER THE HUB</Text>
            </Pressable>
          </SafeAreaView>
        </Animated.View>
      )}

      {/* Skip */}
      <SafeAreaView edges={['top']} style={styles.skipWrap}>
        <Pressable onPress={skip} style={styles.skipBtn} testID="skip-intro-btn">
          <Text style={styles.skipText}>Skip Intro</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F6F1' },
  boy: {
    position: 'absolute', bottom: SH * 0.14, left: SW / 2 - 12,
    alignItems: 'center',
  },
  boyBody: { width: 22, height: 46, backgroundColor: '#0A0A0A', borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  boyHead: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#0A0A0A', marginBottom: -6 },
  guardianWrap: {
    position: 'absolute', top: 0, left: SW / 2 - 55,
    alignItems: 'center', justifyContent: 'center',
  },
  guardianOuterGlow: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: '#B7E3F3', opacity: 0.28, top: -55, left: -55,
    ...(Platform.OS === 'web' ? { filter: 'blur(30px)' as any } : {}),
  },
  guardianOrb: {
    width: 110, height: 110, borderRadius: 55,
    shadowColor: '#00E5FF', shadowOpacity: 0.6, shadowRadius: 30, shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  guardianRing: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.4)',
  },
  guardianRing2: {
    position: 'absolute', width: 175, height: 175, borderRadius: 88,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.25)',
  },
  portalOrb: {
    position: 'absolute', width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0A0A0A', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  portalOrbInitial: { fontWeight: '700', fontSize: 18, letterSpacing: 1 },
  welcome: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: 40, paddingHorizontal: 24,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 22, letterSpacing: 4, color: '#0A0A0A', fontWeight: '800', marginBottom: 8,
  },
  welcomeSub: {
    color: '#1D1D1F', opacity: 0.7, textAlign: 'center', marginBottom: 20, fontSize: 14, maxWidth: 320,
  },
  cta: {
    backgroundColor: '#0A0A0A', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 999,
    shadowColor: '#D4AF37', shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 6 },
  },
  ctaText: { color: '#FFFFFF', fontWeight: '700', letterSpacing: 2, fontSize: 13 },
  skipWrap: { position: 'absolute', top: 0, right: 0 },
  skipBtn: { padding: 16 },
  skipText: { color: '#0A0A0A', opacity: 0.6, fontSize: 12, letterSpacing: 1 },
});
