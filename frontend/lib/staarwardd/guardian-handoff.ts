export type GuardianHandoffState = "loading" | "ready" | "delayed" | "error" | "entering";

export function nextGuardianHandoffState(guardianLoaded: boolean, mapleLoaded: boolean, hadError: boolean, isDelayed: boolean): GuardianHandoffState {
  if (hadError) return "error";
  if (guardianLoaded && mapleLoaded) return "ready";
  return isDelayed ? "delayed" : "loading";
}
