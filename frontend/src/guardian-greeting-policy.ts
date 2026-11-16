/** Proactive speech is permitted only during Toronto's awake window.
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
