import type { PortalId } from "@/lib/staarwardd/types";

export type RoomPreference = "Living Room" | "Kitchen" | "Bedroom" | "Home Office" | "Command Field";
export type ScenePreference = "Focus" | "Welcome" | "Wind Down" | "Cinema" | "Quiet Reset";

export type PreferenceMemory = {
  consented: boolean;
  autoApplyInApp: boolean;
  activityHistoryEnabled: boolean;
  displayName: string;
  preferredPortal: PortalId | null;
  preferredRoom: RoomPreference | null;
  preferredScene: ScenePreference | null;
  routineWindow: "Morning" | "Day" | "Evening" | null;
  learnedAt: string | null;
};

export const DEFAULT_MEMORY: PreferenceMemory = {
  consented: false,
  autoApplyInApp: false,
  activityHistoryEnabled: false,
  displayName: "",
  preferredPortal: null,
  preferredRoom: null,
  preferredScene: null,
  routineWindow: null,
  learnedAt: null,
};

export const ROOMS: RoomPreference[] = ["Living Room", "Kitchen", "Bedroom", "Home Office", "Command Field"];
export const SCENES: ScenePreference[] = ["Focus", "Welcome", "Wind Down", "Cinema", "Quiet Reset"];

/**
 * The memory layer may only apply low-risk in-app presentation choices.
 * It must never directly control homes, locks, cameras, alarms, payments,
 * accounts, media subscriptions, or any external provider.
 */
export function canAutoApplyInApp(memory: PreferenceMemory) {
  return memory.consented && memory.autoApplyInApp && Boolean(memory.preferredPortal || memory.preferredScene);
}

export function describeMemory(memory: PreferenceMemory) {
  const pieces = [memory.preferredRoom, memory.preferredScene, memory.routineWindow].filter(Boolean);
  return pieces.length ? pieces.join(" · ") : "No preferences remembered yet";
}
