import type { PortalId } from "@/lib/staarwardd/types";

export type AmbientKey = "hub" | PortalId;
export type ExperienceGuardianState = "hover" | "pointing" | "speaking" | "listening" | "summoning";
export type ExperienceGuardianMood = "witty" | "focused" | "calm" | "empathetic" | "excited" | "stylish";

export interface PortalExperience {
  world: string;
  atmosphere: string;
  gradient: readonly [string, string, string];
  transition: string;
  entryAction: string;
  guardianTone: string;
  guardianState: ExperienceGuardianState;
  guardianMood: ExperienceGuardianMood;
  guardianLine: string;
  guardianFollowUp: string;
  voiceRate: number;
  ambient: AmbientKey;
  signatureAreas: string[];
  dataState: string;
  keepsHorizons: boolean;
}

export const PORTAL_EXPERIENCES: Record<PortalId, PortalExperience> = {
  creativity: { world: "Imagination Laboratory", atmosphere: "A living studio of color, material, and unfinished possibility.", gradient: ["#24164C", "#521B66", "#0E1838"], transition: "SPARK OPENING", entryAction: "Catches a floating spark, opens it, and releases material into the forming studio.", guardianTone: "Curious · energetic · imaginative", guardianState: "summoning", guardianMood: "witty", guardianLine: "How are you feeling? What idea keeps coming back?", guardianFollowUp: "No pressure for a masterpiece. Give me one fragment and we will see what it wants to become.", voiceRate: 0.98, ambient: "creativity", signatureAreas: ["Inspiration Wall", "Idea Forge", "Blank Canvas", "Mood Board", "Creative Playground", "Surprise Me"], dataState: "Ideas in this experience stay local until a connected memory service is available.", keepsHorizons: false },
  work: { world: "Executive Command Workspace", atmosphere: "A decisive strategy room where signal rises above noise.", gradient: ["#071B3A", "#123D78", "#0A1023"], transition: "GRID ACTIVATION", entryAction: "Draws a structured energy grid, then gestures through the cleared path.", guardianTone: "Focused · sharp · efficient", guardianState: "pointing", guardianMood: "focused", guardianLine: "Give me the real priority. We will make the next move count.", guardianFollowUp: "We do not need twenty-five tasks. We need the one move that changes today.", voiceRate: 1.02, ambient: "work", signatureAreas: ["Priority Command", "Projects", "Meetings", "Decisions", "Deep Work", "Wins"], dataState: "Plans are local preview work until an authenticated workspace connection is available.", keepsHorizons: true },
  home: { world: "Protected Threshold", atmosphere: "A calm, personal environment tuned to the rhythm of the day.", gradient: ["#603D27", "#1C3650", "#081B25"], transition: "THRESHOLD OPENING", entryAction: "Builds a warm protective doorway and settles into a calm welcome.", guardianTone: "Calm · protective · practical", guardianState: "hover", guardianMood: "calm", guardianLine: "Home should make room for you, not ask more from you.", guardianFollowUp: "I can help you prepare a calmer rhythm. Connected-device state is shown only when it is truly available.", voiceRate: 0.91, ambient: "home", signatureAreas: ["Home Rhythm", "Maintenance", "Deliveries", "Household Reminders", "Weather", "Calm Reset"], dataState: "No home devices are connected in this build. Device states are intentionally not fabricated.", keepsHorizons: true },
  wellbeing: { world: "Quiet Water Sanctuary", atmosphere: "Soft water, stone, air, and restorative space without diagnosis or urgency.", gradient: ["#063D49", "#116356", "#0A2130"], transition: "SANCTUARY UNFOLDING", entryAction: "Slows into a visible breath, opening a gentle water-and-light sanctuary.", guardianTone: "Gentle · grounded · patient", guardianState: "listening", guardianMood: "calm", guardianLine: "Do you want to talk, reset, or just sit for a minute?", guardianFollowUp: "We can take this one breath at a time. No diagnosis, no performance—just a useful next step.", voiceRate: 0.87, ambient: "wellbeing", signatureAreas: ["Check In", "Breathe", "Reset", "Meditation", "Reflections", "Low-Energy Mode"], dataState: "No wearable or health data is connected in this build. Wellbeing support is non-clinical.", keepsHorizons: true },
  relationships: { world: "Constellation of Connection", atmosphere: "A warm social field for perspective, preparation, and chosen connection.", gradient: ["#571C49", "#9A3E65", "#281126"], transition: "CONSTELLATION CONNECTING", entryAction: "Opens one hand and links constellation lights into a soft shared path.", guardianTone: "Warm · nuanced · emotionally intelligent", guardianState: "speaking", guardianMood: "empathetic", guardianLine: "Tell me what kind of connection you want to make room for.", guardianFollowUp: "I will offer perspective, not certainty. You decide what belongs in your life.", voiceRate: 0.94, ambient: "relationships", signatureAreas: ["Connection Compass", "Boundaries", "Quality Time", "Date Ideas", "Shared Goals", "Thoughtful Drafts"], dataState: "Relationship context is never assumed. Add only what you choose to share in this preview.", keepsHorizons: true },
  events: { world: "Current City Gateway", atmosphere: "A social gateway for planning without pretending live availability exists.", gradient: ["#3A2609", "#78540F", "#11182F"], transition: "CITY GATEWAY LAUNCH", entryAction: "Launches a moving city gateway and points toward a prepared local option.", guardianTone: "Excited · current · socially aware", guardianState: "pointing", guardianMood: "excited", guardianLine: "What kind of energy are we finding this time?", guardianFollowUp: "These are local discovery previews, not live availability. We can still plan with intention.", voiceRate: 1.0, ambient: "events", signatureAreas: ["Interest Signals", "Saved Plans", "Remind Me", "Invite Draft", "Plan Around This", "Local Discovery"], dataState: "Live events, friends, tickets, and registrations are not connected in this build.", keepsHorizons: true },
  style: { world: "Private Future Atelier", atmosphere: "A luminous wardrobe world for clear personal expression, beginning with what you own.", gradient: ["#472014", "#7F3D2E", "#15101B"], transition: "ATELIER THRESHOLD", entryAction: "Makes a confident turn and opens a clean atelier threshold with one precise gesture.", guardianTone: "Confident · expressive · fashion-aware", guardianState: "pointing", guardianMood: "stylish", guardianLine: "Do you want safe, sharp, or dangerous today?", guardianFollowUp: "Let us start with what is already yours. Great style is not a shopping cart.", voiceRate: 1.0, ambient: "style", signatureAreas: ["Your Closet", "Today’s Look", "Complete the Look", "Saved Looks", "Packing", "Wardrobe Gaps"], dataState: "No wardrobe, purchase, or store data is connected in this build. Preferences require your permission.", keepsHorizons: true },
};

export function homeDayPart(date = new Date()) { const hour = date.getHours(); return hour >= 7 && hour < 19 ? "day" : "night"; }
export function guardianReply(portalId: PortalId, input: string) { const experience = PORTAL_EXPERIENCES[portalId]; const summary = input.trim() || experience.guardianLine; return `${experience.guardianFollowUp} I heard: “${summary}”`; }
