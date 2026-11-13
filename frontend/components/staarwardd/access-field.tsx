import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

/** Decorative chrome field. All controls remain outside the moving layer. */
export function AccessField() {
  const [phase] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    let alive = true;
    const configure = (reduced: boolean) => {
      loop?.stop(); phase.setValue(0);
      if (!reduced && alive) {
        loop = Animated.loop(Animated.timing(phase, { toValue: 1, duration: 26000, easing: Easing.linear, useNativeDriver: true }));
        loop.start();
      }
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(configure).catch(() => configure(true));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', configure);
    return () => { alive = false; loop?.stop(); subscription.remove(); };
  }, [phase]);
  return <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
    <Animated.View style={[styles.ring, { transform: [{ rotate: phase.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }, { scaleX: 1.18 }] }]} />
    <Animated.View style={[styles.inner, { opacity: phase.interpolate({ inputRange: [0, .5, 1], outputRange: [.25, .7, .25] }) }]} />
    <View style={styles.axis} /><View style={[styles.axis, { transform: [{ rotate: '90deg' }] }]} />
  </View>;
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', width: 260, height: 260, left: '50%', top: 25, marginLeft: -130, borderRadius: 130, borderWidth: 1, borderColor: 'rgba(230,235,241,.3)', borderTopWidth: 3, borderTopColor: '#DFE5EC', borderBottomColor: '#616973' },
  inner: { position: 'absolute', width: 290, height: 290, left: '50%', top: 10, marginLeft: -145, borderRadius: 145, borderWidth: 1, borderStyle: 'dashed', borderColor: '#B8C0CA' },
  axis: { position: 'absolute', width: 340, height: 1, backgroundColor: 'rgba(230,235,241,.12)', left: '50%', marginLeft: -170, top: 155 },
});
