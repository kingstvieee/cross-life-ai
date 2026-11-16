/** Guardian may speak spontaneously only during permitted waking hours.
 * Device-local clock is used while the user is actively inside the app.
 * Explicit user-requested speech is deliberately outside this policy.
 */
export function isProactiveWelcomeTime(date: Date): boolean {
  const hour = date.getHours();
  return Number.isInteger(hour) && hour >= 12 && hour < 22;
}
