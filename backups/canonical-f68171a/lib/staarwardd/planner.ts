import { PORTAL_META_BY_ID } from "./portal-meta";
import type { Horizon, PlanPreview, PortalId, TaskPreview } from "./types";

const PORTAL_KEYWORDS: Record<PortalId, string[]> = {
  work: ["work", "meeting", "email", "deadline", "project", "presentation", "client", "focus"],
  creativity: ["creative", "creativity", "write", "paint", "music", "idea", "design"],
  home: ["home", "grocer", "meal", "clean", "repair", "laundry", "kitchen"],
  wellbeing: ["wellbeing", "wellness", "health", "walk", "sleep", "stress", "exercise", "meditat"],
  relationships: ["relationship", "partner", "friend", "family", "date", "message"],
  events: ["event", "gather", "invite", "rsvp", "community", "volunteer", "neighbour", "ticket"],
  style: ["style", "outfit", "wardrobe", "wear", "clothing"],
};

const SENSITIVE_INTENT = /send|email|message|contact|invite|book|buy|purchase|cancel|delete|share|publish|pay|order|register|rsvp/;

const PLAYBOOKS: Record<PortalId, Record<Horizon, [string, string, string]>> = {
  work: {
    now: ["Choose the leverage point", "Name the smallest useful deliverable and protect one uninterrupted 20-minute start.", "Start focus"],
    today: ["Triage the workday", "Sort must-do, should-do, and later work; then begin the highest-value deliverable.", "Mark ready"],
    week: ["Protect deep work", "Reserve one 60-minute block for work that changes the week.", "Schedule block"],
  },
  creativity: {
    now: ["Capture the living idea", "Write the idea in one sentence, choose its form, and make an intentionally rough first move.", "Begin draft"],
    today: ["Build a creative container", "Set one constraint, one reference, and one finish line so inspiration can become form.", "Save ritual"],
    week: ["Complete a shareable version", "Protect a making session and define what finished enough means.", "Schedule studio time"],
  },
  home: {
    now: ["Create visible calm", "Reset the one surface or room that will make the whole home feel lighter.", "Start reset"],
    today: ["Close the household loop", "Sequence food, cleanup, laundry, and supplies so each task supports the next.", "Add home rhythm"],
    week: ["Prevent the next pile-up", "Choose one repeatable 30-minute reset and assign it a realistic day.", "Schedule reset"],
  },
  wellbeing: {
    now: ["Regulate before optimizing", "Take water, three slower breaths, and a brief movement break before the next demand.", "Begin reset"],
    today: ["Protect the energy floor", "Pair focused effort with food, hydration, movement, and a realistic stop time.", "Add recovery"],
    week: ["Build recovery into the plan", "Choose three realistic moments for movement, rest, or quiet.", "Add rhythm"],
  },
  relationships: {
    now: ["Name the connection need", "Choose whether this moment needs listening, appreciation, repair, a boundary, or presence.", "Open compass"],
    today: ["Prepare a human message", "Draft a warm, specific note in your voice; keep sending behind explicit approval.", "Review draft"],
    week: ["Create a connection ritual", "Choose one person, one meaningful question, and one realistic time to reconnect.", "Schedule check-in"],
  },
  events: {
    now: ["Choose a meaningful gathering", "Match one event, invitation, or local contribution with your available time, energy, and access needs.", "Open event map"],
    today: ["Build a grounded shortlist", "Compare the event, timing, and recovery space before committing.", "Review options"],
    week: ["Make arrival feel easy", "Prepare the time, details, and any outreach needed without overfilling the week.", "Prepare plan"],
  },
  style: {
    now: ["Build the outfit formula", "Choose the occasion, silhouette, anchor piece, layer, and finishing detail using your wardrobe first.", "Open outfit studio"],
    today: ["Prepare the complete look", "Lay out clothing, shoes, accessories, grooming, and a weather-aware backup.", "Save look"],
    week: ["Edit with intention", "Create keep, tailor, repair, restyle, and release groups before considering a purchase.", "Start wardrobe edit"],
  },
};

function hash(value: string) {
  let hashValue = 2166136261;
  for (const character of value) {
    hashValue ^= character.charCodeAt(0);
    hashValue = Math.imul(hashValue, 16777619);
  }
  return (hashValue >>> 0).toString(36);
}

function task(portalId: PortalId, horizon: Horizon, request: string, sensitive: boolean): TaskPreview {
  const [title, detail, defaultAction] = PLAYBOOKS[portalId][horizon];
  return {
    id: `${portalId}-${horizon}-${hash(`${request}-${title}`)}`,
    portalId,
    title,
    detail: `${detail} Focus: “${request}”`,
    time: horizon === "now" ? "Now · 20 min" : horizon === "today" ? "Today" : "This week",
    action: sensitive ? "Review action" : defaultAction,
    sensitive,
  };
}

export function createPreviewPlan(input: string, preferredPortalId: PortalId): PlanPreview {
  const request = input.trim() || PORTAL_META_BY_ID[preferredPortalId].promptSeed;
  const lower = request.toLowerCase();
  const matchedPortals = (Object.keys(PORTAL_KEYWORDS) as PortalId[]).filter((id) => PORTAL_KEYWORDS[id].some((keyword) => lower.includes(keyword)));
  const portals = matchedPortals.length ? matchedPortals : [preferredPortalId];
  const sensitive = SENSITIVE_INTENT.test(lower);
  const primary = portals[0];

  return {
    id: `preview-${hash(lower)}`,
    summary: `A calm, coordinated preview across ${portals.map((id) => PORTAL_META_BY_ID[id].name).join(" + ")}.`,
    portals,
    sensitive,
    now: portals.slice(0, 2).map((portalId, index) => task(portalId, "now", request, sensitive && index === 0)),
    today: portals.map((portalId, index) => task(portalId, "today", request, sensitive && index === 0)),
    week: [task(primary, "week", request, false), ...(primary === "wellbeing" ? [] : [task("wellbeing", "week", request, false)])],
  };
}
