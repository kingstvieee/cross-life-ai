export type SafetySeverity = "info" | "attention" | "urgent" | "critical";
export type SafetyKind = "door" | "window" | "cooktop" | "smokeCo" | "waterLeak" | "motion";

export type SafetyFinding = {
  id: string;
  kind: SafetyKind;
  severity: SafetySeverity;
  title: string;
  detail: string;
  requestedAction: string;
  source: "simulated" | "authorized-device";
  requiresApproval: boolean;
};

export type SafetyPreferences = {
  consented: boolean;
  proactiveInAppAlerts: boolean;
  quietHours: boolean;
  demoReviewEnabled: boolean;
};

export const DEFAULT_SAFETY_PREFERENCES: SafetyPreferences = {
  consented: false,
  proactiveInAppAlerts: false,
  quietHours: false,
  demoReviewEnabled: false,
};

/** Demonstration content only. It is never shown as real sensor telemetry. */
export const DEMO_FINDINGS: SafetyFinding[] = [
  { id: "cooktop", kind: "cooktop", severity: "urgent", title: "Kitchen cooktop appears active", detail: "Demo only: an authorized cooktop feed would be needed to confirm a burner state.", requestedAction: "Prepare a reminder or request a device check", source: "simulated", requiresApproval: true },
  { id: "window", kind: "window", severity: "attention", title: "Living room window is open", detail: "Demo only: an authorized contact sensor would be needed to confirm this state.", requestedAction: "Prepare a close-window reminder", source: "simulated", requiresApproval: false },
  { id: "door", kind: "door", severity: "attention", title: "Front door is unlocked", detail: "Demo only: an authorized lock feed would be needed to confirm this state.", requestedAction: "Request your approval to lock after review", source: "simulated", requiresApproval: true },
];

export function canPresentProactiveAlert(preferences: SafetyPreferences) {
  return preferences.consented && preferences.proactiveInAppAlerts && !preferences.quietHours;
}

export function needsApproval(finding: SafetyFinding) {
  return finding.requiresApproval || ["urgent", "critical"].includes(finding.severity);
}

export function severityColor(severity: SafetySeverity) {
  return { info: "#4AA7FF", attention: "#E8C86F", urgent: "#F08B54", critical: "#F0809B" }[severity];
}
