/** Toronto awake window for legacy opt-in and ordinary proactive speech.
 * Device travel and timezone changes must never bypass protected morning focus.
 * Fail closed if the platform cannot resolve the authoritative time zone.
 * Explicit user-initiated speech is exempt from this automatic-delivery policy.
 */
export function isProactiveWelcomeTime(date: Date): boolean {
  if (!Number.isFinite(date.getTime())) return false;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto', hour: '2-digit', hourCycle: 'h23',
    }).formatToParts(date);
    const hour = Number(parts.find(part => part.type === 'hour')?.value);
    return Number.isInteger(hour) && hour >= 12 && hour < 22;
  } catch {
    return false;
  }
}

export type ArrivalPreference = 'off' | 'awake-hours' | 'on-entry';

export function decodeArrivalPreference(value: string | null): ArrivalPreference {
  if (value === 'arrival-on-entry') return 'on-entry';
  return value === 'enabled' ? 'awake-hours' : 'off';
}

export function permitsArrivalTime(date: Date, preference: ArrivalPreference): boolean {
  return Number.isFinite(date.getTime()) &&
    (preference === 'on-entry' || (preference === 'awake-hours' && isProactiveWelcomeTime(date)));
}

export function shouldRearmArrival(date: Date, awaySince: number | null, preference: ArrivalPreference) {
  return awaySince !== null && Number.isFinite(awaySince) &&
    date.getTime() - awaySince >= 20 * 60 * 1000 && permitsArrivalTime(date, preference);
}

// Ephemeral cooldown protects against repeated greetings if navigation remounts Home.
export function makeArrivalCooldown(intervalMs = 20 * 60 * 1000) {
  let accountKey: string | null = null;
  let lastAttempt = -Infinity;
  return (key: string, now: number) => {
    if (!key || !Number.isFinite(now)) return false;
    if (accountKey !== key) {
      accountKey = key;
      lastAttempt = -Infinity;
    }
    if (now - lastAttempt < intervalMs) return false;
    lastAttempt = now;
    return true;
  };
}

/** Wait for the visual cue normally, without letting a renderer failure block voice. */
export function arrivalPresentationAllowsGreeting(modelReady: boolean, arrived: boolean, visualWaitElapsed: boolean) {
  return (modelReady && arrived) || visualWaitElapsed;
}

/** Missing or type-mismatched privacy flags never authorize an automatic welcome. */
export function decodeArrivalConsent(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const { privateMode, speechQuiet, consent } = value as Record<string, unknown>;
  if (typeof privateMode !== 'boolean' || typeof speechQuiet !== 'boolean') return null;
  const flags = consent && typeof consent === 'object' ? consent as Record<string, unknown> : {};
  return { privateMode, speechQuiet, greetings: flags.greetings === true, checkIns: flags.checkIns === true };
}
