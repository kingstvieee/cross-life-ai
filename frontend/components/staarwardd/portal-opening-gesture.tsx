import { glow } from "@/lib/staarwardd/shadow";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

export function PortalOpeningGesture({ color, compact = false }: { color: string; compact?: boolean }) {
  const left = useRef(new Animated.Value(0)).current;
  const right = useRef(new Animated.Value(0)).current;
  const core = useRef(new Animated.Value(0)).current;
  const release = useRef(new Animated.Value(0.2)).current;
  const sparks = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const motion = Animated.sequence([
      Animated.parallel([
        Animated.timing(left, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(right, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(core, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(release, { toValue: 1, duration: 580, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(core, { toValue: 0.5, duration: 580, useNativeDriver: true }),
        Animated.timing(sparks, { toValue: 1, duration: 760, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]);
    motion.start();
    return () => motion.stop();
  }, [core, left, release, right, sparks]);
  const size = compact ? 170 : 280;
  const leftX = left.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.66, -size * 0.14] });
  const rightX = right.interpolate({ inputRange: [0, 1], outputRange: [size * 0.66, size * 0.14] });
  const arcRotate = left.interpolate({ inputRange: [0, 1], outputRange: ["-120deg", "-25deg"] });
  const rightRotate = right.interpolate({ inputRange: [0, 1], outputRange: ["120deg", "25deg"] });
  const coreScale = core.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const releaseScale = release.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.18] });
  const sparkOpacity = sparks.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0.95, 0.18] });
  const sparkScale = sparks.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1.2] });
  return <View style={[styles.root, { width: size, height: size, pointerEvents: "none" }]}><Animated.View style={[styles.arc, styles.leftArc, { borderColor: color, opacity: left, transform: [{ translateX: leftX }, { rotate: arcRotate }] }]} /><Animated.View style={[styles.arc, styles.rightArc, { borderColor: color, opacity: right, transform: [{ translateX: rightX }, { rotate: rightRotate }] }]} /><Animated.View style={[styles.core, { backgroundColor: color, opacity: core, transform: [{ scale: coreScale }] }]} /><Animated.View style={[styles.release, { borderColor: color, opacity: release, transform: [{ scale: releaseScale }] }]} />{Array.from({ length: 20 }, (_, index) => { const angle = (index / 20) * Math.PI * 2; const radius = size * 0.37; return <Animated.View key={index} style={[styles.spark, { backgroundColor: color, left: size / 2 + Math.cos(angle) * radius, top: size / 2 + Math.sin(angle) * radius, opacity: sparkOpacity, transform: [{ scale: sparkScale }] }]} />; })}</View>;
}

const styles = StyleSheet.create({ root: { position: "absolute", alignItems: "center", justifyContent: "center" }, arc: { position: "absolute", width: "58%", height: "58%", borderRadius: 999, borderWidth: 2.5, borderTopColor: "transparent", borderBottomColor: "transparent" }, leftArc: { left: "-16%" }, rightArc: { right: "-16%" }, core: { width: "18%", aspectRatio: 1, borderRadius: 999, ...glow("#FFFFFF", 12, 0.9) }, release: { position: "absolute", width: "76%", aspectRatio: 1, borderRadius: 999, borderWidth: 2 }, spark: { position: "absolute", width: 5, height: 5, borderRadius: 5, ...glow("#FFD966", 7, 1) } });
