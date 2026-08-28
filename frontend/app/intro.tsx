import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withRepeat, withSequence, Easing,
} from 'react-native-reanimated';
import { Canvas, Circle, BlurMask } from '@shopify/react-native-skia';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PORTAL_IDS, portalMeta, IMG } from '@/src/theme';

const { width: SW, height: SH } = Dimensions.get('window');
const CX = SW / 2;
const CY = SH * 0.42;
const RADIUS = Math.min(SW * 0.37, 155);

function PortalOrb({ pid, x, y, progress }: { pid: string; x: number; y: number; progress: Animated.SharedValue<number> }) {
  const meta = portalMeta[pid];
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.5 + progress.value * 0.5 }],
  }));
  return (
    <Animated.View
      style={[styles.portalOrb, { left: x, top: y, borderColor: meta.accent, shadowColor: meta.accent }, style]}
      pointerEvents="none"
    >
      <Text style={[styles.portalOrbInitial, { color: meta.accent }]}>{meta.name[0]}</Text>
    </Animated.View>
  );
}

export default function Intro() {
  const router = useRouter();
  const [phase, setPhase] = useState<'city' | 'arrival' | 'welcome'>('city');

  const photoScale = useSharedValue(1.15);
  const photoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const guardianY = useSharedValue(-SH * 0.5);
  const guardianGlow = useSharedValue(0.6);
  const welcomeOpacity = useSharedValue(0);
  const portalOrbs = PORTAL_IDS.map(() => useSharedValue(0));

  useEffect(() => {
    photoOpacity.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) });
    photoScale.value = withTiming(1, { duration: 9000, easing: Easing.out(Easing.quad) });
    titleOpacity.value = withDelay(700, withSequence(
      withTiming(1, { duration: 900 }),
      withDelay(1400, withTiming(0, { duration: 600 })),
    ));
    const t1 = setTimeout(() => {
      setPhase('arrival');
      flashOpacity.value = withSequence(withTiming(0.55, { duration: 250 }), withTiming(0, { duration: 700 }));
      guardianY.value = withTiming(0, { duration: 1400, easing: Easing.out(Easing.cubic) });
      guardianGlow.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), -1, true);
    }, 3200);
    const t2 = setTimeout(() => {
      portalOrbs.forEach((v, i) => {
        v.value = withDelay(i * 220, withTiming(1, { duration: 520, easing: Easing.out(Easing.back(1.6)) }));
      });
    }, 4700);
    const t3 = setTimeout(() => {
      setPhase('welcome');
      welcomeOpacity.value = withTiming(1, { duration: 700 });
    }, 7200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const photoStyle = useAnimatedStyle(() => ({
    opacity: photoOpacity.value,
    transform: [{ scale: photoScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const guardianStyle = useAnimatedStyle(() => ({ transform: [{ translateY: guardianY.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.5 + guardianGlow.value * 0.5 }));
  const welcomeStyle = useAnimatedStyle(() => ({ opacity: welcomeOpacity.value }));

  const skip = () => router.replace('/landing');

  return (
    <View style={styles.root} testID="intro-root">
      {/* Cinematic Toronto photo, slow push-in */}
      <Animated.View style={[StyleSheet.absoluteFill, photoStyle]}>
        <Image source={{ uri: IMG.toronto }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
      </Animated.View>
      {/* Heavy dark scrim */}
      <ExpoGradient
        colors={['rgba(10,11,14,0.35)', 'rgba(10,11,14,0.15)', 'rgba(10,11,14,0.55)', '#0A0B0E']}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Opening line */}
      <Animated.View style={[styles.titleWrap, titleStyle]} pointerEvents="none">
        <Text style={styles.titleKicker}>TORONTO · TONIGHT</Text>
        <Text style={styles.titleLine}>One city. One life.{'\n'}Seven dimensions.</Text>
      </Animated.View>

      {/* Guardian arrival flash */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#9BEEFF' }, flashStyle]} />

      {/* Guardian orb — Skia glow */}
      {phase !== 'city' && (
        <Animated.View style={[styles.guardianWrap, guardianStyle]} pointerEvents="none">
          <Animated.View style={glowStyle}>
            <Canvas style={{ width: 240, height: 240 }}>
              <Circle cx={120} cy={120} r={86} color="#00E5FF" opacity={0.5}>
                <BlurMask blur={55} style="normal" />
              </Circle>
              <Circle cx={120} cy={120} r={62} color="#1DE9B6" opacity={0.25}>
                <BlurMask blur={30} style="normal" />
              </Circle>
              <Circle cx={120} cy={120} r={44} color="#EAFDFF" />
              <Circle cx={120} cy={120} r={58} color="rgba(0,229,255,0.5)" style="stroke" strokeWidth={1} />
              <Circle cx={120} cy={120} r={74} color="rgba(0,229,255,0.22)" style="stroke" strokeWidth={1} />
            </Canvas>
          </Animated.View>
        </Animated.View>
      )}

      {/* Seven portals bloom */}
      {PORTAL_IDS.map((pid, i) => {
        const angle = (Math.PI * 2 * i) / PORTAL_IDS.length - Math.PI / 2;
        const x = CX + Math.cos(angle) * RADIUS - 27;
        const y = CY + Math.sin(angle) * RADIUS - 27;
        return <PortalOrb key={pid} pid={pid} x={x} y={y} progress={portalOrbs[i]} />;
      })}

      {/* Welcome */}
      {phase === 'welcome' && (
        <Animated.View style={[styles.welcome, welcomeStyle]}>
          <SafeAreaView edges={['bottom']} style={{ width: '100%', alignItems: 'center' }}>
            <Text style={styles.welcomeTitle}>STAAR HUB</Text>
            <Text style={styles.welcomeSub}>Your life isn't seven separate systems.{'\n'}Neither are we.</Text>
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
  root: { flex: 1, backgroundColor: '#0A0B0E' },
  titleWrap: { position: 'absolute', top: SH * 0.16, left: 28, right: 28 },
  titleKicker: { color: '#00E5FF', fontSize: 11, letterSpacing: 5, fontWeight: '800' },
  titleLine: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', lineHeight: 42, marginTop: 12, letterSpacing: 0.5 },
  guardianWrap: {
    position: 'absolute', top: CY - 120, left: CX - 120,
    alignItems: 'center', justifyContent: 'center',
  },
  portalOrb: {
    position: 'absolute', width: 54, height: 54, borderRadius: 27,
    backgroundColor: 'rgba(21,23,29,0.82)',
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.7, shadowRadius: 14, shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  portalOrbInitial: { fontWeight: '800', fontSize: 18, letterSpacing: 1 },
  welcome: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: 44, paddingHorizontal: 24,
    alignItems: 'center',
  },
  welcomeTitle: { fontSize: 24, letterSpacing: 8, color: '#FFFFFF', fontWeight: '800', marginBottom: 10 },
  welcomeSub: {
    color: '#D1D5DB', textAlign: 'center', marginBottom: 24, fontSize: 14.5, lineHeight: 21, maxWidth: 320,
  },
  cta: {
    backgroundColor: '#00E5FF', paddingHorizontal: 36, paddingVertical: 17, borderRadius: 999,
    shadowColor: '#00E5FF', shadowOpacity: 0.55, shadowRadius: 22, shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  ctaText: { color: '#000000', fontWeight: '800', letterSpacing: 2.5, fontSize: 13 },
  skipWrap: { position: 'absolute', top: 0, right: 0 },
  skipBtn: { padding: 18 },
  skipText: { color: '#FFFFFF', opacity: 0.65, fontSize: 12, letterSpacing: 1.5 },
});
