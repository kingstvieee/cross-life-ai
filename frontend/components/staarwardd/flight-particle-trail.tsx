import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet } from "react-native";

function FlightParticle({ index }: { index: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const position = useMemo(() => ({ left: `${4 + ((index * 17) % 88)}%` as `${number}%`, top: `${22 + ((index * 31) % 55)}%` as `${number}%`, size: 2 + (index % 4) }), [index]);
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([Animated.delay((index % 6) * 95), Animated.timing(pulse, { toValue: 1, duration: 620, easing: Easing.out(Easing.quad), useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 560, easing: Easing.in(Easing.quad), useNativeDriver: true })]));
    animation.start();
    return () => animation.stop();
  }, [index, pulse]);
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.98] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1.45] });
  return <Animated.View style={[styles.dot, { left: position.left, top: position.top, width: position.size, height: position.size, borderRadius: position.size, opacity, transform: [{ scale }] }]} />;
}

export function FlightParticleTrail({ visible, reducedMotion }: { visible: boolean; reducedMotion: boolean }) {
  return <Animated.View pointerEvents="none" style={[styles.root, { opacity: visible ? 1 : 0 }]}>{Array.from({ length: reducedMotion ? 8 : 28 }, (_, index) => <FlightParticle key={index} index={index} />)}</Animated.View>;
}

const styles = StyleSheet.create({ root: { ...StyleSheet.absoluteFillObject }, dot: { position: "absolute", backgroundColor: "#F7DC84", shadowColor: "#FFD966", shadowOpacity: 1, shadowRadius: 8 } });
