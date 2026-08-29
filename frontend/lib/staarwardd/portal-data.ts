import type { DimensionProfile, PortalId } from "@/lib/staarwardd/types";
import { PORTAL_META } from "@/lib/staarwardd/portal-meta";

const images: Record<PortalId, number> = {
  creativity: require("@/assets/images/staarwardd/portal-creativity-v7.webp"),
  work: require("@/assets/images/staarwardd/portal-work-v7.webp"),
  home: require("@/assets/images/staarwardd/portal-home-v7.webp"),
  wellbeing: require("@/assets/images/staarwardd/portal-wellbeing-v7.webp"),
  relationships: require("@/assets/images/staarwardd/portal-relationships-v7.webp"),
  events: require("@/assets/images/staarwardd/portal-community-v7.webp"),
  style: require("@/assets/images/staarwardd/portal-style-v7.webp"),
};

export const PORTALS: DimensionProfile[] = PORTAL_META.map((portal) => ({ ...portal, image: images[portal.id] }));
export const PORTAL_BY_ID = Object.fromEntries(PORTALS.map((portal) => [portal.id, portal])) as Record<PortalId, DimensionProfile>;
export const INTERACTION_MODES = ["Listen", "Coach", "Plan", "Create", "Operate"] as const;
