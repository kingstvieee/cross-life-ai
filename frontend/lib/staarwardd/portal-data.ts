import type { DimensionProfile, PortalId } from "@/lib/staarwardd/types";
import { PORTAL_META } from "@/lib/staarwardd/portal-meta";

const images: Record<PortalId, number> = {
  creativity: require("@/assets/images/staarwardd/portal-creativity-chrome.webp"),
  work: require("@/assets/images/staarwardd/portal-work-chrome.webp"),
  home: require("@/assets/images/staarwardd/portal-home-chrome.webp"),
  wellbeing: require("@/assets/images/staarwardd/portal-wellbeing-chrome.webp"),
  relationships: require("@/assets/images/staarwardd/portal-relationships-chrome.webp"),
  events: require("@/assets/images/staarwardd/portal-community-chrome.webp"),
  style: require("@/assets/images/staarwardd/portal-style-chrome.webp"),
};

export const PORTALS: DimensionProfile[] = PORTAL_META.map((portal) => ({ ...portal, image: images[portal.id] }));
export const PORTAL_BY_ID = Object.fromEntries(PORTALS.map((portal) => [portal.id, portal])) as Record<PortalId, DimensionProfile>;
export const INTERACTION_MODES = ["Listen", "Coach", "Plan", "Create", "Operate"] as const;

// Music and games are artwork previews, not new permission or workflow domains.
const previewWorlds = [...PORTALS,
  { id: "staarsonic", name: "STAARSONIC", image: require("@/assets/images/staarwardd/portal-staarsonic-chrome.webp") },
  { id: "staarverse", name: "STARVERSE", image: require("@/assets/images/staarwardd/portal-staarverse-chrome.webp") },
];

const approvedOrder = ["home", "work", "creativity", "wellbeing", "relationships", "events", "style", "staarverse", "staarsonic"];
export const PREVIEW_WORLDS = approvedOrder.map(id => previewWorlds.find(world => world.id === id)!);
