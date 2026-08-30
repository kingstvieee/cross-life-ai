import { textGlow } from "@/lib/staarwardd/shadow";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { DimensionProfile } from "@/lib/staarwardd/types";

export function PortalCard({ portal, onPress }: { portal: DimensionProfile; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Enter ${portal.name}`} onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <Image source={portal.image} style={styles.image} resizeMode="cover" />
      <View style={[styles.tint, { backgroundColor: portal.color }]} />
      <View style={styles.content}>
        <Text style={styles.glyph}>{portal.glyph}</Text>
        <Text style={styles.name}>{portal.name}</Text>
        <Text numberOfLines={1} style={styles.promise}>{portal.promise}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minHeight: 164, borderRadius: 20, overflow: "hidden", backgroundColor: "#11182A", marginBottom: 12, marginHorizontal: 5, borderWidth: 1, borderColor: "rgba(219, 229, 255, 0.12)" },
  cardPressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  image: { ...StyleSheet.absoluteFillObject, height: "100%", width: "100%", opacity: 0.68 },
  tint: { ...StyleSheet.absoluteFillObject, opacity: 0.12 },
  content: { flex: 1, justifyContent: "flex-end", padding: 14, backgroundColor: "rgba(4, 8, 18, 0.36)" },
  glyph: { color: "#F9FBFF", fontSize: 21, marginBottom: 25, ...textGlow("#0C1428", 8) },
  name: { color: "#F5F7FC", fontSize: 17, fontWeight: "800" },
  promise: { color: "#D7E0F0", fontSize: 10, fontWeight: "600", marginTop: 4 },
});
