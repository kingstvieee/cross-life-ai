import { useState } from "react";
import { useRouter } from "expo-router";

import { CinematicHub } from "@/components/staarwardd/cinematic-hub";
import { LaunchSequence, useReturningUser } from "@/components/staarwardd/launch-sequence";

export default function IndexScreen() {
  const router = useRouter();
  const { markSeen } = useReturningUser();
  // The main URL always plays the complete canonical entrance on every fresh
  // page load — the opening-seen flag never short-circuits it. Direct /hub
  // stays available as the fast path.
  const [sessionEntered, setSessionEntered] = useState(false);

  if (!sessionEntered) {
    return (
      <LaunchSequence
        onComplete={() => { markSeen(); setSessionEntered(true); }}
        onSelectPortal={(id) => { markSeen(); router.replace({ pathname: "/portal/[id]", params: { id } }); }}
      />
    );
  }
  return <CinematicHub />;
}
