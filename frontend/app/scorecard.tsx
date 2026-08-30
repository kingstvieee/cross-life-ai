import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { JudgeReset } from "@/components/staarwardd/judge-reset";
import { glow } from "@/lib/staarwardd/shadow";
import { useGuardianActivity } from "@/lib/staarwardd/guardian-activity";
import { usePreferenceMemory } from "@/lib/staarwardd/preference-memory";

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

  const remembered = [
    memory.displayName ? `Name — ${memory.displayName}` : null,
    memory.preferredRoom ? `Favorite space — ${memory.preferredRoom}` : null,
    memory.preferredScene ? `Preferred scene — ${memory.preferredScene}` : null,
    memory.routineWindow ? `Routine window — ${memory.routineWindow}` : null,
    memory.preferredPortal ? `Preferred world — ${memory.preferredPortal}` : null,
  ].filter(Boolean) as string[];

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.kicker}>STAARWAARDD · JUDGE SCORECARD</Text>
        <Text style={s.title} testID="scorecard-title">What the Guardian handled</Text>
        <Text style={s.subtitle}>A closing summary of everything coordinated during this demo.</Text>

        <View style={s.statsRow}>
          <View style={s.statCard} testID="scorecard-actions-stat">
            <Text style={s.statValue}>{receipts.length}</Text>
            <Text style={s.statLabel}>COORDINATED{"\n"}ACTIONS</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{remembered.length}</Text>
            <Text style={s.statLabel}>PREFERENCES{"\n"}REMEMBERED</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{memory.consented ? "ON" : "OFF"}</Text>
            <Text style={s.statLabel}>GUARDIAN{"\n"}MEMORY</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>COORDINATION RECEIPTS</Text>
        {receipts.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>The Guardian stood ready. Run the Work → Wellbeing flow to see cross-life coordination captured here.</Text>
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

        <Pressable accessibilityRole="button" onPress={() => router.replace("/hub")} style={s.hubBtn} testID="scorecard-hub-btn">
          <Text style={s.hubBtnText}>BACK TO HUB</Text>
        </Pressable>
        <View style={s.resetRow}>
          <JudgeReset />
          <Text style={s.resetHint}>RESET FOR THE NEXT JUDGE</Text>
        </View>
      </ScrollView>
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
  hubBtn: { marginTop: 28, minHeight: 50, borderRadius: 999, borderWidth: 1, borderColor: "#00E5FF", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,229,255,0.1)", ...glow("#00E5FF", 16, 0.35) },
  hubBtnText: { color: "#00E5FF", fontSize: 13, letterSpacing: 2, fontWeight: "800" },
  resetRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 18 },
  resetHint: { color: "#E8C86F", fontSize: 10, letterSpacing: 1.6, fontWeight: "800" },
});
