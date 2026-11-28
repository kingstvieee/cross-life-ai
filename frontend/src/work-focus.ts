export const cleanWorkFocus = (value: unknown) =>
  typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) : '';

export function workFocusKey(userId: string) {
  return 'staar.work-focus.' + Array.from(userId, value => value.codePointAt(0)!.toString(16)).join('.');
}

export function createWorkFocusHandoff() {
  let pending: { owner: string; title: string; expiresAt: number } | null = null;
  return {
    stage(owner: string, value: string, now = Date.now()) {
      const title = cleanWorkFocus(value);
      pending = owner && title && Number.isFinite(now) ? { owner, title, expiresAt: now + 60_000 } : null;
      return Boolean(pending);
    },
    consume(owner: string, portal: string | undefined, now = Date.now()) {
      if (portal !== 'work') return null;
      const item = pending;
      pending = null;
      if (!item || item.owner !== owner || !Number.isFinite(now) || now >= item.expiresAt) return null;
      return 'My current work focus is ' + JSON.stringify(item.title) + '. Help me choose one practical next step.';
    },
  };
}

export const workFocusHandoff = createWorkFocusHandoff();

export function workFocusHubPreferenceKey(userId: string) {
  return workFocusKey(userId) + '.show-on-hub.v1';
}

export function visibleHubWorkFocus(
  saved: { account: string; title: string } | null,
  activeAccount: string | null,
  visibility: { foreground: boolean; privacyVerified: boolean; privateMode: boolean },
) {
  return saved && activeAccount && saved.account === activeAccount &&
    visibility.foreground && visibility.privacyVerified && !visibility.privateMode ? saved.title : '';
}
