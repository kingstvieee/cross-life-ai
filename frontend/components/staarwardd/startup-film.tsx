import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from "react-native";
import StartupFilmPlayer from "./startup-film-player";

const ReplayContext = createContext<() => void>(() => undefined);
export const useStartupReplay = () => useContext(ReplayContext);

export function StartupFilmBoundary({ children }: { children: React.ReactNode }) {
  const [reduced, setReduced] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(true);
  const [entered, setEntered] = useState(false);
  const [instance, setInstance] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const finishing = useRef(false);
  const finish = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;
    setPlaying(false);
    setEntered(true);
    Animated.timing(opacity, { toValue: 0, duration: reduced ? 0 : 450, useNativeDriver: true }).start(() => setVisible(false));
  }, [opacity, reduced]);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); }).catch(() => { if (active) setReduced(false); });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { active = false; subscription.remove(); opacity.stopAnimation(); };
  }, [opacity]);
  useEffect(() => { if (reduced) finish(); }, [reduced, finish]);
  useEffect(() => {
    if (!visible || ready || reduced !== false) return;
    const timer = setTimeout(() => setFailed(true), 15000);
    return () => clearTimeout(timer);
  }, [visible, ready, reduced, instance]);
  const onReady = useCallback(() => { setReady(true); setFailed(false); }, []);
  const onError = useCallback(() => { setFailed(true); setPlaying(false); }, []);
  const replay = useCallback(() => {
    if (reduced) return;
    finishing.current = false;
    opacity.setValue(1);
    setReady(false); setFailed(false); setMuted(true); setPlaying(true);
    setInstance(value => value + 1); setVisible(true);
  }, [opacity, reduced]);

  return <ReplayContext.Provider value={replay}>
    <View style={styles.root}>
      {entered ? children : null}
      {visible && <Animated.View style={[StyleSheet.absoluteFill, styles.film, { opacity }]} accessibilityViewIsModal testID="startup-film">
        {reduced === false && <StartupFilmPlayer key={instance} muted={muted} playing={playing} onEnd={finish} onError={onError} onReady={onReady} />}
        <View style={styles.top}><Text style={styles.brand}>STAARWAARDD</Text><Pressable accessibilityRole="button" accessibilityLabel="Skip startup film" onPress={finish} style={styles.button}><Text style={styles.text}>Skip</Text></Pressable></View>
        {!ready && !failed && <ActivityIndicator color="#CCD2D9" accessibilityLabel="Loading startup film" />}
        <View style={styles.bottom}>
          {failed && <Text style={styles.message}>The film couldn’t load. You can enter the app.</Text>}
          <View style={styles.controls}>
            <Pressable accessibilityRole="button" onPress={() => { setPlaying(true); setMuted(false); }} style={styles.button}><Text style={styles.text}>Play with sound</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={muted ? "Unmute startup film" : "Mute startup film"} onPress={() => setMuted(value => !value)} style={styles.button}><Text style={styles.text}>{muted ? "Sound off" : "Sound on"}</Text></Pressable>
            {failed && <Pressable accessibilityRole="button" onPress={finish} style={styles.button}><Text style={styles.text}>Enter app</Text></Pressable>}
          </View>
        </View>
      </Animated.View>}
    </View>
  </ReplayContext.Provider>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  film: { zIndex: 10000, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  top: { position: "absolute", top: 52, left: 20, right: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { color: "#D5DAE1", fontSize: 11, fontWeight: "700", letterSpacing: 3 },
  button: { borderWidth: 1, borderColor: "#7B838E", backgroundColor: "rgba(5,7,10,0.86)", borderRadius: 24, paddingHorizontal: 18, paddingVertical: 13, minHeight: 44 },
  text: { color: "#E8ECF1", fontSize: 12 },
  bottom: { position: "absolute", bottom: 42, left: 20, right: 20, alignItems: "center", gap: 14 },
  controls: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 },
  message: { color: "#E8ECF1", fontSize: 13, textAlign: "center" },
});
