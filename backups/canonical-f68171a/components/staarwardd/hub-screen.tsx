import { useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { PortalCard } from "@/components/staarwardd/portal-card";
import { haptic } from "@/lib/staarwardd/haptics";
import { PORTALS } from "@/lib/staarwardd/portal-data";

export function HubScreen() {
  const router = useRouter();
  const [aboutOpen, setAboutOpen] = useState(false);

  const openPortal = (id: string) => {
    haptic.light();
    router.push({ pathname: "/portal/[id]", params: { id } } as never);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <FlatList
        data={PORTALS}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <Text style={styles.kicker}>STAAR COMMAND CENTER</Text>
                <Text style={styles.title}>Good evening.</Text>
                <Text style={styles.subtitle}>Choose a dimension to shape what matters next.</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="About this STAARWARDD preview" onPress={() => setAboutOpen(true)} style={({ pressed }) => [styles.infoButton, pressed && styles.pressed]}>
                <Text style={styles.infoText}>i</Text>
              </Pressable>
            </View>
            <View style={styles.signalCard}>
              <View style={styles.signalDot} />
              <View style={styles.signalCopy}>
                <Text style={styles.signalLabel}>COMMAND STATUS</Text>
                <Text style={styles.signalTitle}>Your dimensions are ready.</Text>
                <Text style={styles.signalDetail}>Open one portal at a time. Preview actions never run outside the app.</Text>
              </View>
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Seven dimensions</Text>
              <Text style={styles.sectionHint}>Tap to enter</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => <PortalCard portal={item} onPress={() => openPortal(item.id)} />}
        ListFooterComponent={
          <View style={styles.footer}>
            <Pressable accessibilityRole="button" onPress={() => Alert.alert("Companion devices", "Kaya / Atlas connection states will remain unavailable until the original device protocol and entitlement service are supplied. No physical device is connected in this preview.")} style={({ pressed }) => [styles.footerButton, pressed && styles.pressed]}>
              <Text style={styles.footerButtonText}>COMPANION STATUS</Text>
              <Text style={styles.footerChevron}>›</Text>
            </Pressable>
            <Text style={styles.footerNote}>STAARWARDD v1.2.0 · Native preview</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
      <Modal transparent visible={aboutOpen} animationType="fade" onRequestClose={() => setAboutOpen(false)}>
        <View style={styles.modalBack}>
          <View style={styles.modalCard}>
            <Text style={styles.modalKicker}>ABOUT THIS PREVIEW</Text>
            <Text style={styles.modalTitle}>One operating system, seven dimensions.</Text>
            <Text style={styles.modalCopy}>This native build preserves the source-backed planning and approval boundary. It is a local preview: no account, database, live AI, hardware, or external action is represented as connected.</Text>
            <Pressable accessibilityRole="button" onPress={() => setAboutOpen(false)} style={({ pressed }) => [styles.modalButton, pressed && styles.pressed]}><Text style={styles.modalButtonText}>UNDERSTOOD</Text></Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#080B14" },
  list: { paddingHorizontal: 15, paddingBottom: 30 },
  row: { justifyContent: "space-between" },
  header: { paddingTop: 18, paddingHorizontal: 5, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  kicker: { color: "#E8C86F", fontSize: 10, letterSpacing: 1.6, fontWeight: "800" },
  title: { color: "#F4F7FF", fontSize: 29, fontWeight: "800", letterSpacing: -0.6, marginTop: 7 },
  subtitle: { color: "#AEBBD3", fontSize: 14, lineHeight: 20, marginTop: 5, maxWidth: 270 },
  infoButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: "rgba(232,200,111,0.42)", alignItems: "center", justifyContent: "center", marginTop: 3 },
  infoText: { color: "#E8C86F", fontSize: 17, fontFamily: "serif", fontStyle: "italic" },
  signalCard: { marginTop: 22, marginBottom: 27, borderRadius: 18, padding: 17, backgroundColor: "#10192D", borderWidth: 1, borderColor: "rgba(111, 150, 220, 0.16)", flexDirection: "row" },
  signalDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#50D5B7", marginTop: 5, marginRight: 10 },
  signalCopy: { flex: 1 },
  signalLabel: { color: "#89A2C8", fontSize: 9, letterSpacing: 1.2, fontWeight: "800" },
  signalTitle: { color: "#F0F5FF", fontSize: 16, fontWeight: "700", marginTop: 4 },
  signalDetail: { color: "#AAB7CD", fontSize: 12, lineHeight: 17, marginTop: 4 },
  sectionRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: 5 },
  sectionTitle: { color: "#EDF3FF", fontSize: 17, fontWeight: "800" },
  sectionHint: { color: "#8D9DB9", fontSize: 11, fontWeight: "600" },
  footer: { paddingTop: 12, paddingHorizontal: 5 },
  footerButton: { minHeight: 54, borderWidth: 1, borderColor: "rgba(220, 230, 252, 0.14)", borderRadius: 17, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footerButtonText: { color: "#C8D6EF", fontSize: 11, fontWeight: "800", letterSpacing: 1.1 },
  footerChevron: { color: "#E8C86F", fontSize: 27, lineHeight: 28 },
  footerNote: { color: "#65718B", fontSize: 11, textAlign: "center", marginTop: 17 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  modalBack: { flex: 1, backgroundColor: "rgba(2,5,12,0.72)", justifyContent: "flex-end", padding: 16 },
  modalCard: { backgroundColor: "#121C31", borderRadius: 24, padding: 22, borderWidth: 1, borderColor: "rgba(232,200,111,0.25)" },
  modalKicker: { color: "#E8C86F", fontSize: 10, letterSpacing: 1.4, fontWeight: "800" },
  modalTitle: { color: "#F4F7FF", fontSize: 22, lineHeight: 28, fontWeight: "800", marginTop: 8 },
  modalCopy: { color: "#C4CEE0", fontSize: 14, lineHeight: 21, marginTop: 10 },
  modalButton: { marginTop: 20, minHeight: 52, alignItems: "center", justifyContent: "center", backgroundColor: "#E8C86F", borderRadius: 15 },
  modalButtonText: { color: "#161720", fontSize: 12, letterSpacing: 1.1, fontWeight: "800" },
});
