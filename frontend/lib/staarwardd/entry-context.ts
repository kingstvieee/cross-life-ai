import type { PortalId } from "./types";

export type EntryKind = "web" | "nfc";

export type GuardianEntryContext = {
  entry: EntryKind;
  portalId: PortalId | null;
  portalName: string | null;
  zone: string | null;
  physical: boolean;
  openedAt: string;
};

const PORTAL_NAME_TO_ID: Record<string, PortalId> = {
  creativity: "creativity",
  work: "work",
  home: "home",
  wellbeing: "wellbeing",
  relationships: "relationships",
  community: "events",
  style: "style",
};

const PORTAL_DISPLAY_NAMES: Record<PortalId, string> = {
  creativity: "Creativity",
  work: "Work",
  home: "Home",
  wellbeing: "Wellbeing",
  relationships: "Relationships",
  events: "Community",
  style: "Style",
};

function cleanZone(value?: string | null): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[^a-z0-9 _-]/gi, "").trim().slice(0, 64);
  return cleaned || null;
}

function resolvePortal(value?: string | null): PortalId | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return PORTAL_NAME_TO_ID[normalized] ?? null;
}

/**
 * Creates the canonical entry context used when STAAR Hub is opened from the
 * web or from a physical/NFC touchpoint. Unknown portal values are rejected,
 * physical entry is only granted to explicit NFC entry, and zone labels are
 * sanitized before they reach Guardian planning or UI.
 */
export function createGuardianEntryContext(input: {
  entry?: string | null;
  portal?: string | null;
  zone?: string | null;
  openedAt?: string;
}): GuardianEntryContext {
  const physical = (input.entry ?? "web").toLowerCase() === "nfc";
  const portalId = resolvePortal(input.portal);

  return {
    entry: physical ? "nfc" : "web",
    portalId,
    portalName: portalId ? PORTAL_DISPLAY_NAMES[portalId] : null,
    zone: cleanZone(input.zone),
    physical,
    openedAt: input.openedAt ?? new Date().toISOString(),
  };
}

export function describePhysicalContext(context?: GuardianEntryContext | null): string | null {
  if (!context?.physical) return null;
  const location = context.zone ? context.zone.replace(/[-_]+/g, " ") : "this space";
  const domain = context.portalName ? `${context.portalName} life domain` : "STAAR Hub";
  return `${domain} connected through NFC in ${location}`;
}
