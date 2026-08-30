// Session-scoped portal visit counts (reset per page load / judge reset) used
// to distinguish a judge's first entry into a world from a return visit.
const visits: Record<string, number> = {};

export const notePortalVisit = (portalId: string): number => {
  visits[portalId] = (visits[portalId] ?? 0) + 1;
  return visits[portalId];
};

export const clearPortalVisits = (): void => {
  for (const key of Object.keys(visits)) delete visits[key];
};
