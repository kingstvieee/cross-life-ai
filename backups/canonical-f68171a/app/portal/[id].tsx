import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { PortalScreen } from "@/components/staarwardd/portal-screen";
import { PORTAL_BY_ID } from "@/lib/staarwardd/portal-data";
import type { PortalId } from "@/lib/staarwardd/types";

export default function PortalRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id || !(id in PORTAL_BY_ID)) {
    return <View style={{ flex: 1, backgroundColor: "#080B14", justifyContent: "center", alignItems: "center", padding: 24 }}><Text style={{ color: "#EFF5FF", fontSize: 17, fontWeight: "700" }}>This dimension is unavailable.</Text></View>;
  }
  return <PortalScreen portalId={id as PortalId} />;
}
