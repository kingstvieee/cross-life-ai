const rawBackendUrl = (process.env.EXPO_PUBLIC_BACKEND_URL ?? "").trim();

/**
 * Native and web API calls must use an explicitly configured HTTPS/HTTP origin.
 * There is intentionally no relative-URL fallback: an unset production backend
 * must be visible as a configuration error, not a misleading local request.
 */
export function backendUrl(path = ""): string {
  if (!rawBackendUrl) throw new Error("EXPO_PUBLIC_BACKEND_URL is required for Guardian backend access");
  if (!/^https?:\/\//i.test(rawBackendUrl)) throw new Error("EXPO_PUBLIC_BACKEND_URL must be an absolute HTTP(S) URL");
  return `${rawBackendUrl.replace(/\/$/, "")}${path}`;
}

export const hasConfiguredBackend = Boolean(rawBackendUrl);
