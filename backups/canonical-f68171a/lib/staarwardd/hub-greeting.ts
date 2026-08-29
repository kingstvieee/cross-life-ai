export function getHubAwakeningGreeting(displayName?: string) {
  const name = displayName?.trim();
  return name ? `The field is awake, ${name}. Where shall we begin?` : "The field is awake. Where shall we begin?";
}
