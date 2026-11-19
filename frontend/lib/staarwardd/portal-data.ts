import type { DimensionProfile, PortalId } from "@/lib/staarwardd/types";
import { PORTAL_META } from "@/lib/staarwardd/portal-meta";

const images: Record<PortalId, number> = {
  creativity: require("@/assets/images/staarwardd/locked/creativity.png"),
  work: require("@/assets/images/staarwardd/locked/work.png"),
  home: require("@/assets/images/staarwardd/locked/home.png"),
  wellbeing: require("@/assets/images/staarwardd/locked/wellbeing.png"),
  relationships: require("@/assets/images/staarwardd/locked/love.png"),
  events: require("@/assets/images/staarwardd/locked/events.png"),
  style: require("@/assets/images/staarwardd/locked/style.png"),
};

export const PORTALS: DimensionProfile[] = PORTAL_META.map((portal) => ({ ...portal, image: images[portal.id] }));
export const PORTAL_BY_ID = Object.fromEntries(PORTALS.map((portal) => [portal.id, portal])) as Record<PortalId, DimensionProfile>;
export const INTERACTION_MODES = ["Listen", "Coach", "Plan", "Create", "Operate"] as const;

// Music and games are artwork previews, not new permission or workflow domains.
const previewWorlds = [...PORTALS,
  { id: "staarsonic", name: "STAARSONIC", image: require("@/assets/images/staarwardd/locked/staarsonic.png") },
  { id: "staarverse", name: "STARVERSE", image: require("@/assets/images/staarwardd/locked/staarverse.png") },
];

const approvedOrder = ["home", "work", "creativity", "wellbeing", "relationships", "events", "style", "staarverse", "staarsonic"];
export const PREVIEW_WORLDS = approvedOrder.map(id => previewWorlds.find(world => world.id === id)!);
