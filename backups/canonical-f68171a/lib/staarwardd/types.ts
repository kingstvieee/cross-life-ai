export type PortalId =
  | "creativity"
  | "work"
  | "home"
  | "wellbeing"
  | "relationships"
  | "events"
  | "style";

export type Horizon = "now" | "today" | "week";
export type InteractionMode = "Listen" | "Coach" | "Plan" | "Create" | "Operate";

export interface TaskPreview {
  id: string;
  portalId: PortalId;
  title: string;
  detail: string;
  time: string;
  action: string;
  sensitive: boolean;
}

export interface PlanPreview {
  id: string;
  summary: string;
  portals: PortalId[];
  sensitive: boolean;
  now: TaskPreview[];
  today: TaskPreview[];
  week: TaskPreview[];
}

export interface DimensionProfile {
  id: PortalId;
  name: string;
  glyph: string;
  color: string;
  accent: string;
  eyebrow: string;
  promise: string;
  aiRole: string;
  privacyCue: string;
  defaultMode: InteractionMode;
  focus: string;
  starterActions: string[];
  tools: string[];
  promptSeed: string;
  image: number;
}
