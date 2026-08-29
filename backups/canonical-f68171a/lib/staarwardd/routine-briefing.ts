import type { PortalId } from "@/lib/staarwardd/types";
import type { PreferenceMemory } from "@/lib/staarwardd/preference-policy";

const PORTAL_QUESTIONS: Record<PortalId, (memory: PreferenceMemory) => string> = {
  creativity: () => "What idea is ready for your attention?",
  work: () => "Which next step deserves your focus?",
  home: (memory) => `Would a ${memory.preferredRoom ?? "useful space"} reset help most?`,
  wellbeing: (memory) => memory.preferredScene === "Quiet Reset" ? "Would a quiet reset help before anything else?" : "Would energy, movement, or rest help most?",
  relationships: () => "Who would you like to connect with intentionally?",
  events: () => "What meaningful plan needs your attention?",
  style: () => "What expression would serve today?",
};

const PORTAL_ORDER: PortalId[] = ["creativity", "work", "home", "wellbeing", "relationships", "events", "style"];

export type RoutineBriefing = {
  heading: string;
  prompt: string;
  narration: string;
  questions: Array<{ id: PortalId; name: string; question: string }>;
};

const PORTAL_NAMES: Record<PortalId, string> = {
  creativity: "Creativity",
  work: "Work",
  home: "Home",
  wellbeing: "Wellbeing",
  relationships: "Relationships",
  events: "Events",
  style: "Style",
};

export function getRoutineBriefing(memory: PreferenceMemory): RoutineBriefing {
  const questions = PORTAL_ORDER.map((id) => ({ id, name: PORTAL_NAMES[id], question: PORTAL_QUESTIONS[id](memory) }));
  const greeting = memory.displayName.trim() ? `Welcome, ${memory.displayName.trim()}.` : "Welcome.";
  const window = memory.routineWindow ? `${memory.routineWindow} routine` : "Portal routine";
  const preferred = memory.preferredPortal
    ? `Your usual starting point is ${PORTAL_NAMES[memory.preferredPortal]}.`
    : "Choose the world that serves you first.";
  const narration = `${greeting} ${window} is ready. ${questions.map(({ name, question }) => `${name}. ${question}`).join(" ")} ${preferred}`;

  return {
    heading: window.toUpperCase(),
    prompt: preferred,
    narration,
    questions,
  };
}
