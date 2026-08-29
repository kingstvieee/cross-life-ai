import { Pressable, StyleSheet, Text, View } from "react-native";

import type { GuardianInteraction } from "@/lib/staarwardd/guardian-interaction";

const STATE_LABEL: Record<GuardianInteraction["policy"]["state"], string> = {
  suggested: "SUGGESTED",
  prepared: "PREPARED",
  "approval-required": "APPROVAL REQUIRED",
  unavailable: "UNAVAILABLE",
  denied: "NOT APPROVED",
  executing: "PREPARING",
  completed: "LOCAL STEP COMPLETE",
  failed: "RECOVERY NEEDED",
};

export function GuardianInteractionCard({
  interaction,
  onPrimary,
  onSecondary,
  primaryLabel,
}: {
  interaction: GuardianInteraction;
  onPrimary?: () => void;
  onSecondary?: () => void;
  primaryLabel?: string;
}) {
  const { policy, voice } = interaction;
  return <View accessibilityRole="summary" style={[styles.card, stateStyle(policy.state)]}>
    <View style={styles.header}><Text style={styles.kicker}>GUARDIAN · {STATE_LABEL[policy.state]}</Text><Text style={styles.risk}>{policy.risk.toUpperCase()}</Text></View>
    <Text style={styles.message}>{voice.text}</Text>
    <View style={styles.receipt}><Text style={styles.receiptLabel}>ACTIVITY RECEIPT</Text><Text style={styles.receiptText}>Trigger: {policy.receipt.trigger}</Text><Text style={styles.receiptText}>Outcome: {policy.receipt.outcome.replace(/-/g, " ")} · Approval: {policy.receipt.approvalState.replace(/-/g, " ")}</Text></View>
    {(onPrimary || onSecondary) && <View style={styles.actions}>{onSecondary && <Pressable accessibilityRole="button" onPress={onSecondary} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}><Text style={styles.secondaryText}>{voice.choices[1] ?? "Cancel"}</Text></Pressable>}{onPrimary && <Pressable accessibilityRole="button" onPress={onPrimary} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text style={styles.primaryText}>{primaryLabel ?? voice.choices[0] ?? "Continue"}</Text></Pressable>}</View>}
  </View>;
}

function stateStyle(state: GuardianInteraction["policy"]["state"]) {
  if (state === "approval-required" || state === "denied") return styles.caution;
  if (state === "unavailable" || state === "failed") return styles.recovery;
  if (state === "completed") return styles.celebration;
  return styles.guide;
}

const styles = StyleSheet.create({
  card: { marginTop: 12, padding: 14, borderLeftWidth: 2, borderRadius: 14, backgroundColor: "rgba(7,13,28,0.62)" },
  guide: { borderLeftColor: "#E8C86F" }, caution: { borderLeftColor: "#F0B365" }, recovery: { borderLeftColor: "#F08B9C" }, celebration: { borderLeftColor: "#70E3C8" },
  header: { flexDirection: "row", justifyContent: "space-between", gap: 10 }, kicker: { color: "#E8C86F", fontSize: 9, letterSpacing: 1, fontWeight: "800", flex: 1 }, risk: { color: "#AFBED5", fontSize: 9, letterSpacing: 0.8, fontWeight: "800" },
  message: { color: "#E8EEF8", fontSize: 13, lineHeight: 19, marginTop: 5 },
  receipt: { marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: "rgba(217,229,255,0.07)" }, receiptLabel: { color: "#95A9C9", fontSize: 8, letterSpacing: 1, fontWeight: "800" }, receiptText: { color: "#B9C7DD", fontSize: 10, lineHeight: 14, marginTop: 3 },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 }, primary: { flex: 1, minHeight: 42, borderRadius: 12, backgroundColor: "#E8C86F", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 }, primaryText: { color: "#151721", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 }, secondary: { flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: "rgba(222,232,255,0.2)", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 }, secondaryText: { color: "#CFDAED", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
