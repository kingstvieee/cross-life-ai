import { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useAuth } from "@/src/auth";
import { PORTALS } from "@/lib/staarwardd/portal-data";

export function AccessBoundary({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const path = usePathname();
  if (loading) return <View style={styles.page}><ActivityIndicator accessibilityLabel="Checking session" /></View>;
  if (user && !user.is_demo) return <>{children}</>;
  // Keep every account provider unmounted in guest mode, including memory and activity.
  return path === "/guest" ? <GuestPreview /> : <SignInScreen />;
}

export function SignInScreen() {
  const router = useRouter();
  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.brand}>STAARWAARDD</Text>
    <Text style={styles.heading}>Your worlds. Your access.</Text>
    <Text style={styles.copy}>Sign in to your private hub, or explore the portals as a guest.</Text>
    {["Google", "Microsoft", "Email"].map(name => <View key={name} style={styles.disabled} accessibilityLabel={name + " sign-in, setup pending"}>
      <Text style={styles.label}>Continue with {name}</Text>
      <Text style={styles.caption}>Setup pending</Text>
    </View>)}
    <Text style={styles.caption}>Account sign-in is awaiting identity-provider configuration. No account is created by this preview.</Text>
    <Pressable accessibilityRole="button" style={styles.button} onPress={() => router.replace("/guest")}>
      <Text style={styles.label}>Explore as guest</Text>
    </Pressable>
    <Text style={styles.caption}>Read-only portal previews and sample content.</Text>
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
  page: { flexGrow: 1, backgroundColor: "#FAFAFC", padding: 28, paddingTop: 72, gap: 18, alignItems: "stretch" },
  brand: { color: "#90702E", fontWeight: "800", letterSpacing: 3, fontSize: 13 },
  heading: { color: "#152238", fontSize: 34, fontWeight: "800", maxWidth: 640 },
  copy: { color: "#40516B", fontSize: 17, lineHeight: 26, maxWidth: 640 },
  caption: { color: "#596779", fontSize: 14, lineHeight: 21 },
  disabled: { padding: 20, borderColor: "#CFD5DF", borderWidth: 1, borderRadius: 18, backgroundColor: "#EFF1F5", maxWidth: 640 },
  label: { color: "#152238", fontSize: 18, fontWeight: "700" },
  button: { padding: 20, borderRadius: 18, backgroundColor: "#E9D7AD", maxWidth: 640 },
  card: { padding: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#CFD5DF", borderRadius: 22, gap: 12, maxWidth: 640 },
  image: { width: "100%", height: 210, borderRadius: 14, resizeMode: "cover" },
});
