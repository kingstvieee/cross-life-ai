import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";

import { CinematicHub } from "@/components/staarwardd/cinematic-hub";
import { GuardianArrival } from "@/components/staarwardd/guardian-arrival";
import { LaunchSequence, useReturningUser } from "@/components/staarwardd/launch-sequence";

export default function IndexScreen() {
  const router = useRouter();
  const { loading, returning, markSeen } = useReturningUser();
  const [sessionEntered, setSessionEntered] = useState(false);
  const [arrivalComplete, setArrivalComplete] = useState(false);

  if (loading) return <View style={styles.loading}><ActivityIndicator color="#E8C86F" /></View>;
  if (!returning && !sessionEntered) return <LaunchSequence onComplete={() => { markSeen(); setSessionEntered(true); setArrivalComplete(true); }} onSelectPortal={(id) => { markSeen(); router.replace({ pathname: "/portal/[id]", params: { id } }); }} />;
  if (!arrivalComplete) return <GuardianArrival onComplete={() => setArrivalComplete(true)} />;
  return <CinematicHub />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: "#080B14", justifyContent: "center", alignItems: "center" },
});
