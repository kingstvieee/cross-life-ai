import { Fragment, useEffect, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useAuth } from "@/src/auth";
import { backendUrl } from "@/src/backend-config";
import { useStartupReplay } from "./startup-film";
import { PORTALS } from "@/lib/staarwardd/portal-data";

export function AccessBoundary({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const path = usePathname();
  if (loading) return <View style={styles.page}><ActivityIndicator accessibilityLabel="Checking session" /></View>;
  if (user && !user.is_demo) return <Fragment key={user.user_id}>{children}</Fragment>;
  // Keep every account provider unmounted in guest mode, including memory and activity.
  return path === "/guest" ? <GuestPreview /> : <SignInScreen />;
}

export function SignInScreen() {
  const replay = useStartupReplay();
  const router = useRouter();
  const [enabled, setEnabled] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    if (Platform.OS === "web") {
      try {
        void fetch(backendUrl("/api/auth/providers")).then(r => r.ok ? r.json() : null).then(data => {
          if (active && data) setEnabled(data.providers.filter((p: { id: string; enabled: boolean }) => p.enabled).map((p: { id: string }) => p.id));
        }).catch(() => undefined);
      } catch { /* Guest browsing works without a backend. */ }
    }
    return () => { active = false; };
  }, []);
  return <ScrollView style={styles.screen} contentContainerStyle={styles.entry} showsVerticalScrollIndicator={false}>
    <View style={styles.hero}>
      {Platform.OS === "web" ? <Image source={require("@/assets/images/staarwardd/guardian-toronto.png")} style={[styles.heroImage, { filter: "grayscale(1)" } as any]} accessibilityLabel="Guardian above cinematic Toronto" /> : <View style={styles.nativeHero}><View style={styles.orbitOuter}><View style={styles.orbitInner}><Ionicons name="shield-outline" size={72} color="#D4DAE2" /></View></View></View>}
      <LinearGradient colors={["rgba(2,3,5,0.18)", "rgba(2,3,5,0.08)", "#030405"]} locations={[0, 0.48, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.heroHeader}><Ionicons name="shield-outline" size={19} color="#DCE2E8" /><Text style={styles.wordmark}>STAARWAARDD</Text><Text style={styles.edition}>HUB</Text></View>
      <View style={styles.heroCaption}><View style={styles.rule} /><Text style={styles.overline}>SEVEN WORLDS. ONE PRESENCE.</Text></View>
    </View>
    <LinearGradient colors={["#8D959E", "#30363D", "#A9B1BA", "#24292F"]} locations={[0, 0.28, 0.64, 1]} style={styles.chromeFrame}>
      <View style={styles.accessPanel}>
        <View style={styles.panelTop}><Text style={styles.overline}>YOUR PRIVATE UNIVERSE</Text><Ionicons name="sparkles-outline" size={17} color="#BDC5CF" /></View>
        <Text style={styles.entryTitle}>Step inside.</Text>
        <Text style={styles.entryCopy}>Your life. Your worlds. All connected.</Text>
        <View style={styles.providerStack}>
          {["Google", "Microsoft", "Email"].map(name => {
            const ready = enabled.includes(name.toLowerCase());
            return <Pressable key={name} disabled={!ready} accessibilityRole="button" accessibilityLabel={"Continue with " + name + (ready ? "" : ", coming soon")} accessibilityState={{ disabled: !ready }}
              style={({ pressed }) => [styles.provider, pressed && styles.pressed]}
              onPress={() => { if (Platform.OS === "web") window.location.assign(backendUrl("/api/auth/start/" + name.toLowerCase())); }}>
              <View style={styles.providerIcon}>{name === "Email" ? <Ionicons name="mail-outline" size={19} color="#DDE2E9" /> : <Text style={styles.providerGlyph}>{name === "Google" ? "G" : "⊞"}</Text>}</View>
              <Text style={styles.providerLabel}>Continue with {name}</Text>
              {!ready ? <Text style={styles.soon}>SOON</Text> : <Ionicons name="arrow-forward" size={16} color="#CFD6DE" />}
            </Pressable>;
          })}
        </View>
        <View style={styles.dividerRow}><View style={styles.divider} /><Text style={styles.dividerText}>DISCOVER FIRST</Text><View style={styles.divider} /></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Explore as guest" onPress={() => router.replace("/guest")} style={({ pressed }) => [pressed && styles.pressed]}>
          <LinearGradient colors={["#F2F5F7", "#A3ADB8", "#E5E9EE"]} locations={[0, 0.53, 1]} style={styles.guestButton}>
            <Ionicons name="planet-outline" size={19} color="#12161B" /><Text style={styles.guestLabel}>Explore the portals</Text><Ionicons name="arrow-forward" size={18} color="#12161B" />
          </LinearGradient>
        </Pressable>
        <View style={styles.privateNote}><Ionicons name="lock-closed-outline" size={12} color="#858F9C" /><Text style={styles.privateText}>Guest access · sample worlds only</Text></View>
      </View>
    </LinearGradient>
    <View style={styles.portalStrip}>{PORTALS.slice(0, 3).map(item => <View key={item.id} style={styles.portalThumb}><Image source={item.image} style={styles.thumbImage} /><LinearGradient colors={["transparent", "rgba(0,0,0,0.88)"]} style={StyleSheet.absoluteFill} /><Text style={styles.thumbLabel}>{item.name.toUpperCase()}</Text></View>)}</View>
    <Pressable accessibilityRole="button" accessibilityLabel="Replay startup film" onPress={replay}><Text style={styles.entryFooter}>REPLAY THE ENTRANCE</Text></Pressable>
  </ScrollView>;
}

export function GuestPreview() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const portal = PORTALS.find(item => item.id === selected);
  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.brand}>STAARWAARDD · GUEST PREVIEW</Text>
    <Text style={styles.heading}>{portal ? portal.name : "Explore the portals"}</Text>
    <Text style={styles.copy}>Sample content only. Private accounts, uploads, messages, purchases and connected devices are unavailable.</Text>
    {portal ? <View style={styles.card}>
      <Image source={portal.image} style={styles.image} accessibilityLabel={portal.name + " portal artwork"} />
      <Text style={styles.copy}>This is a sample view of {portal.name}. No workflow is running and no action has been executed.</Text>
      <Pressable style={styles.button} accessibilityRole="button" onPress={() => setSelected(null)}><Text style={styles.label}>Back to portals</Text></Pressable>
    </View> : PORTALS.map(item => <Pressable key={item.id} style={styles.card} accessibilityRole="button" accessibilityLabel={"Preview " + item.name} onPress={() => setSelected(item.id)}>
      <Image source={item.image} style={styles.image} accessibilityLabel={item.name + " portal artwork"} />
      <Text style={styles.label}>{item.name}</Text>
      <Text style={styles.caption}>View sample</Text>
    </Pressable>)}
    <Pressable style={styles.button} accessibilityRole="button" onPress={() => router.replace("/landing")}><Text style={styles.label}>Back to sign in</Text></Pressable>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#030405" },
  entry: { flexGrow: 1, backgroundColor: "#030405", alignItems: "center", paddingBottom: 32 },
  hero: { width: "100%", height: 300, maxWidth: 1100, overflow: "hidden", backgroundColor: "#090C11" },
  heroImage: { width: "100%", height: "100%", resizeMode: "contain", opacity: 0.82 },
  nativeHero: { flex: 1, alignItems: "center", justifyContent: "center" },
  orbitOuter: { width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: "#67727F", alignItems: "center", justifyContent: "center", backgroundColor: "#080C12" },
  orbitInner: { width: 180, height: 180, borderRadius: 90, borderWidth: 2, borderColor: "#B9C3CF", alignItems: "center", justifyContent: "center" },
  heroHeader: { position: "absolute", top: 28, left: 24, right: 24, flexDirection: "row", alignItems: "center", gap: 10 },
  wordmark: { color: "#ECF0F5", fontSize: 14, fontWeight: "800", letterSpacing: 3 },
  edition: { color: "#87919C", fontSize: 9, letterSpacing: 2, marginLeft: "auto" },
  heroCaption: { position: "absolute", bottom: 48, left: 28, right: 28, flexDirection: "row", gap: 12, alignItems: "center" },
  rule: { width: 25, height: 1, backgroundColor: "#B0B8C1" },
  overline: { color: "#AAB3BE", fontSize: 9, fontWeight: "600", letterSpacing: 2.4 },
  chromeFrame: { width: "90%", maxWidth: 420, padding: 1, borderRadius: 25, marginTop: -28 },
  accessPanel: { backgroundColor: "#0A0D12", borderRadius: 24, padding: 24 },
  panelTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 17 },
  entryTitle: { fontSize: 35, fontWeight: "700", letterSpacing: -1.3, color: "#F1F4F8", lineHeight: 42 },
  entryCopy: { fontSize: 13, lineHeight: 20, color: "#939EAC", marginTop: 5, marginBottom: 24 },
  providerStack: { gap: 10 },
  provider: { minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: "#363E49", backgroundColor: "#141920", flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 12 },
  providerIcon: { width: 20, alignItems: "center" },
  providerGlyph: { color: "#DDE2E9", fontSize: 19, fontWeight: "600" },
  providerLabel: { flex: 1, color: "#D8DEE6", fontSize: 13, fontWeight: "500" },
  soon: { color: "#737F8D", fontSize: 8, fontWeight: "600", letterSpacing: 1.4 },
  pressed: { opacity: 0.75 },
  dividerRow: { flexDirection: "row", gap: 12, alignItems: "center", marginVertical: 21 },
  divider: { flex: 1, height: 1, backgroundColor: "#282F38" },
  dividerText: { fontSize: 8, color: "#727E8D", letterSpacing: 1.8 },
  guestButton: { minHeight: 52, borderRadius: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  guestLabel: { color: "#101419", fontSize: 14, fontWeight: "700", flex: 1 },
  privateNote: { marginTop: 15, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  privateText: { color: "#858F9C", fontSize: 10 },
  portalStrip: { width: "90%", maxWidth: 420, flexDirection: "row", gap: 10, marginTop: 22 },
  portalThumb: { height: 68, flex: 1, borderRadius: 10, borderWidth: 1, borderColor: "#353D48", overflow: "hidden", justifyContent: "flex-end" },
  thumbImage: { position: "absolute", width: "100%", height: "100%", resizeMode: "cover", opacity: 0.65 },
  thumbLabel: { color: "#C4CCD5", fontSize: 7, fontWeight: "700", letterSpacing: 1.3, padding: 9 },
  entryFooter: { color: "#626D7B", fontSize: 8, letterSpacing: 2.3, marginTop: 20 },
  page: { flexGrow: 1, backgroundColor: "#030405", padding: 24, paddingTop: 48, gap: 16, alignItems: "stretch" },
  brand: { color: "#B9C2CD", fontWeight: "700", letterSpacing: 2.4, fontSize: 11 },
  heading: { color: "#EEF2F7", fontSize: 28, fontWeight: "700", maxWidth: 640 },
  copy: { color: "#A3AEBC", fontSize: 14, lineHeight: 22, maxWidth: 640 },
  caption: { color: "#84909F", fontSize: 11, lineHeight: 18 },
  label: { color: "#E0E6ED", fontSize: 16, fontWeight: "600" },
  button: { padding: 16, borderWidth: 1, borderColor: "#687482", borderRadius: 14, backgroundColor: "#1C242E", maxWidth: 640 },
  card: { padding: 12, backgroundColor: "#0D1117", borderWidth: 1, borderColor: "#414B58", borderRadius: 20, gap: 10, maxWidth: 640 },
  image: { width: "100%", height: 200, borderRadius: 13, resizeMode: "cover" },
});
