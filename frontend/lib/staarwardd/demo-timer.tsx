import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEMO_SECONDS = 180;

type DemoTimerValue = {
  endsAt: number | null;
  start: (seconds?: number) => void;
  stop: () => void;
};

const Ctx = createContext<DemoTimerValue | null>(null);

export function DemoTimerProvider({ children }: PropsWithChildren) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const start = useCallback((seconds: number = DEMO_SECONDS) => setEndsAt(Date.now() + seconds * 1000), []);
  const stop = useCallback(() => setEndsAt(null), []);
  const value = useMemo(() => ({ endsAt, start, stop }), [endsAt, start, stop]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemoTimer() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useDemoTimer must be used inside DemoTimerProvider");
  return value;
}

// Subtle floating countdown pill shown across every screen while the immersive
// judge demo runs. Tapping it (or the countdown reaching zero) closes the demo
// and opens the Judge Scorecard summary.
export function DemoTimerBadge() {
  const { endsAt, stop } = useDemoTimer();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const iv = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(iv);
  }, [endsAt]);

  const finish = useCallback(() => {
    stop();
    router.replace("/scorecard");
  }, [router, stop]);

  // Time's up — close the demo and present the scorecard automatically.
  useEffect(() => {
    if (!endsAt) return;
    const timer = setTimeout(finish, Math.max(endsAt - Date.now(), 0));
    return () => clearTimeout(timer);
  }, [endsAt, finish]);

  if (!endsAt) return null;
  const remain = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const label = `DEMO · ${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, "0")}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Immersive judge demo countdown — tap to finish and view the scorecard"
      onPress={finish}
      hitSlop={10}
      style={[styles.pill, { top: insets.top + 2 }]}
      testID="demo-timer-badge"
    >
      <Text style={[styles.text, remain <= 10 && styles.textUrgent]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute", alignSelf: "center", zIndex: 40,
    minHeight: 24, paddingHorizontal: 12, justifyContent: "center",
    borderRadius: 999, borderWidth: 1, borderColor: "rgba(232,200,111,0.55)",
    backgroundColor: "rgba(4,7,16,0.82)",
  },
  pillDone: { borderColor: "rgba(255,138,128,0.7)" },
  text: { color: "#F4E9C8", fontSize: 10, letterSpacing: 1.3, fontWeight: "800", fontVariant: ["tabular-nums"] },
  textUrgent: { color: "#FFD1CC" },
});
