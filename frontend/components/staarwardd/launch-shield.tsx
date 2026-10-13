import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, useWindowDimensions, View } from "react-native";

// Reuse the app's maple sigil. This short motion layer precedes the film;
// it never covers the Guardian's face or replaces any filmed frames.
export function LaunchShield({ onComplete }: { onComplete: () => void }) {
  const { width } = useWindowDimensions();
  const motion = useRef(new Animated.Value(0)).current;
  const complete = useRef(onComplete);
  complete.current = onComplete;
  useEffect(() => {
    const animation = Animated.timing(motion, {
      toValue: 1, duration: 1600, easing: Easing.inOut(Easing.cubic), useNativeDriver: true,
    });
    animation.start(({ finished }) => { if (finished) complete.current(); });
    return () => animation.stop();
  }, [motion]);
  return <View style={styles.root} pointerEvents="none" testID="launch-shield">
    <Animated.View style={[StyleSheet.absoluteFill, styles.flash, {
      opacity: motion.interpolate({ inputRange: [0, 0.36, 0.4, 0.47, 0.5, 0.56, 1], outputRange: [0, 0, 0.22, 0, 0.14, 0, 0] }),
    }]} />
    <Animated.View style={{ opacity: motion.interpolate({ inputRange: [0, 0.12, 0.8, 1], outputRange: [0, 1, 1, 0] }), transform: [
      { translateX: motion.interpolate({ inputRange: [0, 0.52, 1], outputRange: [-width, 0, 0] }) },
      { rotate: motion.interpolate({ inputRange: [0, 0.52, 1], outputRange: ["-540deg", "0deg", "0deg"] }) },
      { scale: motion.interpolate({ inputRange: [0, 0.52, 0.8, 1], outputRange: [0.3, 1, 1, 2.8] }) },
    ] }}>
      <Image source={require("@/assets/images/staarwardd/maple-sigil.webp")} style={styles.sigil} resizeMode="contain" />
    </Animated.View>
  </View>;
}
const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(2,5,12,0.65)" },
  flash: { backgroundColor: "#DBEEFF" },
  sigil: { width: 240, height: 240 },
});
