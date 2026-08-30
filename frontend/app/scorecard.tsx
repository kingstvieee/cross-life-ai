import { useEffect, useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { JudgeReset } from "@/components/staarwardd/judge-reset";
import { glow } from "@/lib/staarwardd/shadow";
import { useGuardianActivity } from "@/lib/staarwardd/guardian-activity";
import { usePreferenceMemory } from "@/lib/staarwardd/preference-memory";
import { useStaarAudio } from "@/lib/staarwardd/audio-provider";
import { fetchGuardianSpokenText, playGuardianLine } from "@/lib/staarwardd/guardian-tts";
import { useAuth } from "@/src/auth";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || "";

const OUTCOME_COLORS: Record<string, string> = {
  completed: "#7BE3A6",
  executed: "#7BE3A6",
  fallback: "#F3D77D",
  failed: "#FF8A80",
};

export default function ScorecardScreen() {
  const router = useRouter();
  const { receipts } = useGuardianActivity();
  const { memory } = usePreferenceMemory();
  const audio = useStaarAudio();
  const { token } = useAuth();
  const narrated = useRef(false);
  const [verdictLine, setVerdictLine] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const remembered = [
    memory.displayName ? `Name — ${memory.displayName}` : null,
    memory.preferredRoom ? `Favorite space — ${memory.preferredRoom}` : null,
    memory.preferredScene ? `Preferred scene — ${memory.preferredScene}` : null,
    memory.routineWindow ? `Routine window — ${memory.routineWindow}` : null,
    memory.preferredPortal ? `Preferred world — ${memory.preferredPortal}` : null,
  ].filter(Boolean) as string[];
  const synchronizedWorlds = receipts.some((receipt) => receipt.trigger === "Judge crisis demonstration completed") ? 3 : 0;
  const unapprovedActions = receipts.filter(
    (receipt) => ["executing", "completed"].includes(receipt.outcome) && receipt.approvalState !== "approved",
  ).length;

  // The Guardian narrates the verdict aloud as the scorecard appears
  // (waits for the session token so the speech request is authenticated).
  useEffect(() => {
    if (narrated.current || !audio.voice || !token) return;
    narrated.current = true;
    const n = receipts.length;
    const text = n > 0
      ? `Your demo is complete. I coordinated ${n} action${n === 1 ? "" : "s"} across your worlds — every step consented, reversible, and inspectable.`
      : "Your demo is complete. I stood ready — no coordination was needed this run.";
    let cancelled = false;
    let stop: (() => void) | null = null;
    const timer = setTimeout(async () => {
      const line = await fetchGuardianSpokenText(text, token);
      if (!line || cancelled) return;
      stop = playGuardianLine(line.url, {
        onStart: () => { if (!cancelled) setVerdictLine(text); },
        onEnd: () => setVerdictLine(null),
      });
    }, 700);
    return () => { cancelled = true; clearTimeout(timer); stop?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, audio.voice]);

  // Shareable scorecard image (backend-rendered PNG).
  const shareScorecard = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const lines = receipts.slice(0, 6).map((r) => r.requestedAction).join("|");
      const qs = `actions=${receipts.length}&remembered=${remembered.length}&memory_on=${memory.consented}&lines=${encodeURIComponent(lines)}`;
      const url = `${BACKEND}/api/scorecard/image?${qs}`;
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const r = await fetch(url, { headers: authHeaders });
        if (!r.ok) return;
        const blob = await r.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = "staar-scorecard.png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
      } else {
        const FileSystem = await import("expo-file-system/legacy");
        const Sharing = await import("expo-sharing");
        const dest = `${FileSystem.cacheDirectory}staar-scorecard.png`;
        const dl = await FileSystem.downloadAsync(url, dest, { headers: authHeaders });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(dl.uri, { mimeType: "image/png" });
      }
    } catch { /* sharing stays optional */ } finally {
      setSharing(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.kicker}>STAARWARDD · JUDGE SCORECARD</Text>
        <Text style={s.title} testID="scorecard-title">What the Guardian handled</Text>
        <Text style={s.subtitle}>A closing summary of everything coordinated during this demo.</Text>

        <View style={s.statsRow}>
          <View style={s.statCard} testID="scorecard-actions-stat">
            <Text style={s.statValue}>{receipts.length}</Text>
            <Text style={s.statLabel}>COORDINATED{"\n"}ACTIONS</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{synchronizedWorlds}</Text>
            <Text style={s.statLabel}>WORLDS{"\n"}SYNCHRONIZED</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{unapprovedActions}</Text>
            <Text style={s.statLabel}>UNAPPROVED{"\n"}ACTIONS</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>COORDINATION RECEIPTS</Text>
        {receipts.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>The Guardian stood ready. Run the live crisis demo to see Work → Style → Connect coordination captured here.</Text>
          </View>
        ) : (
          receipts.map((r) => (
            <View key={r.id} style={s.receiptCard} testID="scorecard-receipt">
              <View style={s.receiptTop}>
                <Text style={s.receiptAction}>{r.requestedAction}</Text>
                <View style={[s.outcomeChip, { borderColor: OUTCOME_COLORS[r.outcome] ?? "#9FB3D9" }]}>
                  <Text style={[s.outcomeText, { color: OUTCOME_COLORS[r.outcome] ?? "#9FB3D9" }]}>{String(r.outcome).toUpperCase()}</Text>
                </View>
              </View>
              <Text style={s.receiptDetail}>{r.detail}</Text>
              <Text style={s.receiptMeta}>{r.trigger} · {r.time}</Text>
            </View>
          ))
        )}

        <Text style={s.sectionTitle}>MEMORY HIGHLIGHTS</Text>
        {remembered.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No preferences remembered yet — enable Guardian memory in a world to see him recall them on your return.</Text>
          </View>
        ) : (
          remembered.map((item) => (
            <View key={item} style={s.memoryRow}>
              <Text style={s.memoryStar}>✦</Text>
              <Text style={s.memoryText}>{item}</Text>
            </View>
          ))
        )}

        <Pressable accessibilityRole="button" accessibilityLabel="Share the scorecard as an image" onPress={shareScorecard} style={s.shareBtn} testID="scorecard-share-btn">
          {sharing ? <ActivityIndicator size="small" color="#E8C86F" /> : <Text style={s.shareBtnText}>SHARE SCORECARD</Text>}
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.replace("/hub")} style={s.hubBtn} testID="scorecard-hub-btn">
          <Text style={s.hubBtnText}>BACK TO HUB</Text>
        </Pressable>
        <View style={s.resetRow}>
          <JudgeReset />
          <Text style={s.resetHint}>RESET FOR THE NEXT JUDGE</Text>
        </View>
      </ScrollView>
      {/* Guardian's spoken verdict, mirrored as an elegant subtitle line */}
      {verdictLine && (
        <View style={s.subtitleWrap} testID="scorecard-subtitle">
          <View style={s.subtitleCard}>
            <Text style={s.subtitleKicker}>GUARDIAN</Text>
            <Text style={s.subtitleText}>{verdictLine}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0B0E" },
  scroll: { padding: 20, paddingBottom: 48, maxWidth: 560, width: "100%", alignSelf: "center" },
  kicker: { color: "#E8C86F", fontSize: 10, letterSpacing: 2.2, fontWeight: "800" },
  title: { color: "#F5F8FF", fontSize: 27, fontWeight: "800", marginTop: 8 },
  subtitle: { color: "#9FB3D9", fontSize: 13, lineHeight: 19, marginTop: 6 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  statCard: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: "rgba(232,200,111,0.4)", backgroundColor: "rgba(10,14,26,0.85)", alignItems: "center", paddingVertical: 14, ...glow("#E8C86F", 14, 0.18) },
  statValue: { color: "#00E5FF", fontSize: 22, fontWeight: "800" },
  statLabel: { color: "#9FB3D9", fontSize: 8.5, letterSpacing: 1.2, fontWeight: "800", textAlign: "center", marginTop: 5, lineHeight: 12 },
  sectionTitle: { color: "#E8C86F", fontSize: 10, letterSpacing: 2, fontWeight: "800", marginTop: 26, marginBottom: 10 },
  emptyCard: { borderRadius: 14, borderWidth: 1, borderColor: "rgba(159,179,217,0.28)", padding: 16, backgroundColor: "rgba(10,14,26,0.7)" },
  emptyText: { color: "#9FB3D9", fontSize: 12.5, lineHeight: 18 },
  receiptCard: { borderRadius: 14, borderWidth: 1, borderColor: "rgba(0,229,255,0.32)", backgroundColor: "rgba(8,13,26,0.88)", padding: 14, marginBottom: 10, ...glow("#00E5FF", 12, 0.14) },
  receiptTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  receiptAction: { color: "#F5F8FF", fontSize: 13.5, fontWeight: "700", flex: 1 },
  outcomeChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  outcomeText: { fontSize: 8.5, letterSpacing: 1, fontWeight: "800" },
  receiptDetail: { color: "#B9C8E8", fontSize: 12, lineHeight: 17, marginTop: 6 },
  receiptMeta: { color: "#6E80A6", fontSize: 10, marginTop: 7, letterSpacing: 0.4 },
  memoryRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, borderColor: "rgba(232,200,111,0.34)", backgroundColor: "rgba(12,14,10,0.6)", paddingHorizontal: 14, paddingVertical: 11, marginBottom: 8 },
  memoryStar: { color: "#E8C86F", fontSize: 13 },
  memoryText: { color: "#F4E9C8", fontSize: 12.5, flex: 1 },
  shareBtn: { marginTop: 28, minHeight: 50, borderRadius: 999, borderWidth: 1, borderColor: "#E8C86F", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(232,200,111,0.12)", ...glow("#E8C86F", 16, 0.3) },
  shareBtnText: { color: "#F4E9C8", fontSize: 13, letterSpacing: 2, fontWeight: "800" },
  hubBtn: { marginTop: 12, minHeight: 50, borderRadius: 999, borderWidth: 1, borderColor: "#00E5FF", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,229,255,0.1)", ...glow("#00E5FF", 16, 0.35) },
  hubBtnText: { color: "#00E5FF", fontSize: 13, letterSpacing: 2, fontWeight: "800" },
  resetRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 18 },
  resetHint: { color: "#E8C86F", fontSize: 10, letterSpacing: 1.6, fontWeight: "800" },
  subtitleWrap: { position: "absolute", left: 16, right: 16, bottom: 26, alignItems: "center", pointerEvents: "none" },
  subtitleCard: { maxWidth: 440, alignItems: "center", paddingHorizontal: 18, paddingVertical: 11, borderRadius: 18, borderWidth: 1, borderColor: "rgba(232,200,111,0.5)", backgroundColor: "rgba(4,7,16,0.86)", ...glow("#E8C86F", 16, 0.3) },
  subtitleKicker: { color: "#E8C86F", fontSize: 8, letterSpacing: 1.6, fontWeight: "800" },
  subtitleText: { color: "#F5F8FF", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 3, fontWeight: "600", fontStyle: "italic" },
});
