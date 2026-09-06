export type GuardianPresence = "dormant" | "ambient" | "attentive" | "thinking" | "advising" | "preparing" | "waiting-approval" | "acting" | "confirming";
export type GuardianAttention = "silent" | "ambient" | "surface" | "speak" | "interrupt";
export type MemoryClass = "session" | "routine" | "preference" | "relationship" | "project" | "environment" | "temporary";
export type GuardianPermission = 1 | 2 | 3 | 4;

export const GUARDIAN_PERMISSION = { KNOW: 1 as const, ADVISE: 2 as const, PREPARE: 3 as const, ACT: 4 as const };
export const ATTENTION_LEVEL = { SILENT: 0.25, AMBIENT: 0.45, SURFACE: 0.62, SPEAK: 0.78, INTERRUPT: 0.92 } as const;

export type GuardianEvent = {
  id: string;
  type: string;
  source: string;
  payload: Record<string, unknown>;
  timestamp: number;
  confidence: number;
  urgency: number;
  sensitivity: "normal" | "sensitive" | "high";
  userVisible: boolean;
};

export function guardianEvent(type: string, source: string, payload: Record<string, unknown> = {}, options: Partial<Pick<GuardianEvent, "confidence" | "urgency" | "sensitivity" | "userVisible">> = {}): GuardianEvent {
  return {
    id: typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type, source, payload, timestamp: Date.now(),
    confidence: options.confidence ?? 1,
    urgency: options.urgency ?? 0,
    sensitivity: options.sensitivity ?? "normal",
    userVisible: options.userVisible ?? false,
  };
}

export function calculateSalience({ urgency = 0, impact = 0, timeSensitivity = 0, userRelevance = 0, crossPortalImpact = 0, confidence = 1, interruptionCost = 0 }: { urgency?: number; impact?: number; timeSensitivity?: number; userRelevance?: number; crossPortalImpact?: number; confidence?: number; interruptionCost?: number }) {
  const value = urgency * 0.22 + impact * 0.22 + timeSensitivity * 0.18 + userRelevance * 0.18 + crossPortalImpact * 0.20;
  return Math.max(0, Math.min(1, value * confidence - interruptionCost));
}

export function shouldInterrupt({ salience, currentActivity, lastInterruption, emergency = false }: { salience: number; currentActivity?: string; lastInterruption: number | null; emergency?: boolean }) {
  if (emergency) return true;
  if (salience < ATTENTION_LEVEL.SPEAK) return false;
  if (currentActivity === "high-focus") return salience >= ATTENTION_LEVEL.INTERRUPT;
  if (lastInterruption && Date.now() - lastInterruption < 10 * 60 * 1000) return salience >= 0.9;
  return true;
}

export class GuardianContext {
  private state: Record<string, Record<string, unknown>> = { user: {}, location: {}, schedule: {}, home: {}, work: {}, creativity: {}, wellbeing: {}, relationships: {}, community: {}, style: {} };
  merge(domain: string, patch: Record<string, unknown>) { this.state[domain] = { ...(this.state[domain] ?? {}), ...patch, updatedAt: Date.now() }; return this.state[domain]; }
  snapshot() { return JSON.parse(JSON.stringify(this.state)) as Record<string, Record<string, unknown>>; }
}

type Memory = { class: MemoryClass; key: string; value: unknown; confidence: number; updatedAt: number };
type PortalResponse = { portal: string; observation?: string; recommendation?: string; requiredPermission?: GuardianPermission };
export type GuardianDecision = { surfaced: boolean; attention: GuardianAttention; presence: GuardianPresence; salience: number; portals: string[]; observation?: string; recommendation?: string; requiresApproval: boolean; event: GuardianEvent };

const ROUTING: Record<string, string[]> = {
  HOME_ENTERED: ["home", "work", "relationships", "style"],
  MEETING_DELAYED: ["work", "style", "relationships", "home"],
  CREATIVE_IDEA_CAPTURED: ["creativity"],
  EVENT_DISCOVERED: ["events", "style", "relationships"],
  OUTFIT_REQUIRED: ["style", "work"],
  USER_ROUTINE_CHANGED: ["wellbeing", "home", "work"],
  PORTAL_OPENED: [],
  USER_REQUESTED: [],
};

export class GuardianRuntime {
  readonly context = new GuardianContext();
  readonly events: GuardianEvent[] = [];
  readonly memories: Memory[] = [];
  private attentionQueue: GuardianDecision[] = [];
  private currentPresence: GuardianPresence = "ambient";
  private lastInterruption: number | null = null;
  private currentActivity = "browsing";

  async receive(event: GuardianEvent): Promise<GuardianDecision> {
    this.events.push(event);
    this.updateContext(event);
    const portals = ROUTING[event.type] ?? [];
    const salience = this.score(event, portals);
    const attention = salience < ATTENTION_LEVEL.SILENT ? "silent" : salience < ATTENTION_LEVEL.AMBIENT ? "ambient" : salience < ATTENTION_LEVEL.SURFACE ? "surface" : salience < ATTENTION_LEVEL.SPEAK ? "speak" : "interrupt";
    const interrupted = shouldInterrupt({ salience, currentActivity: this.currentActivity, lastInterruption: this.lastInterruption, emergency: event.urgency >= 0.95 });
    if (interrupted) this.lastInterruption = Date.now();
    const decision: GuardianDecision = {
      surfaced: attention !== "silent",
      attention: interrupted ? "interrupt" : attention,
      presence: attention === "silent" ? "ambient" : attention === "surface" ? "attentive" : attention === "speak" || interrupted ? "advising" : "ambient",
      salience, portals, event,
      observation: attention === "silent" ? undefined : this.observation(event),
      recommendation: attention === "silent" ? undefined : this.recommendation(event),
      requiresApproval: event.type === "USER_REQUESTED" && this.requiredPermission(event) >= GUARDIAN_PERMISSION.ACT,
    };
    this.currentPresence = decision.presence;
    if (decision.surfaced) this.attentionQueue.push(decision);
    return decision;
  }

  staySilent(): GuardianDecision | null { return this.attentionQueue.at(-1) ?? null; }
  get presence() { return this.currentPresence; }
  get queue() { return [...this.attentionQueue]; }
  setActivity(activity: string) { this.currentActivity = activity; }
  remember(memory: Omit<Memory, "updatedAt">) { const next = { ...memory, updatedAt: Date.now() }; const index = this.memories.findIndex((item) => item.class === memory.class && item.key === memory.key); if (index >= 0) this.memories[index] = next; else this.memories.push(next); return next; }
  forget(key: string) { for (let i = this.memories.length - 1; i >= 0; i -= 1) if (this.memories[i].key === key) this.memories.splice(i, 1); }
  snapshot() { return { presence: this.currentPresence, context: this.context.snapshot(), events: [...this.events], memories: [...this.memories], queue: [...this.attentionQueue] }; }

  private updateContext(event: GuardianEvent) { const domain = String(event.payload.domain ?? event.source); this.context.merge(domain, { lastEvent: event.type, ...event.payload }); }
  private score(event: GuardianEvent, portals: string[]) { return calculateSalience({ urgency: event.urgency, impact: event.userVisible ? 0.7 : 0.25, timeSensitivity: event.urgency, userRelevance: event.payload.relevance === "high" ? 1 : 0.45, crossPortalImpact: portals.length > 1 ? 0.8 : 0.15, confidence: event.confidence, interruptionCost: this.currentActivity === "high-focus" ? 0.16 : 0 }); }
  private requiredPermission(event: GuardianEvent): GuardianPermission { return Number(event.payload.requiredPermission ?? GUARDIAN_PERMISSION.PREPARE) as GuardianPermission; }
  private observation(event: GuardianEvent) { if (event.type === "PORTAL_OPENED") return `The ${String(event.payload.portal ?? "current")} world is active. I am keeping continuity in the background.`; if (event.type === "USER_REQUESTED") return "I have the request and I am checking the context before suggesting a next move."; if (event.type === "HOME_ENTERED" && event.payload.scheduleConflict) return "I detected a schedule conflict touching Work, Style, and Relationships."; return `I noticed ${event.type.toLowerCase().replaceAll("_", " ")}.`; }
  private recommendation(event: GuardianEvent) { if (event.type === "USER_REQUESTED") return "One useful move is ready for your review."; if (event.type === "HOME_ENTERED" && event.payload.scheduleConflict) return "Your schedule has a collision across three life dimensions. I am holding the next move for your review."; return "I will hold this quietly unless it becomes more relevant."; }
}

export const guardianRuntime = new GuardianRuntime();
