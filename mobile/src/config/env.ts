/**
 * App configuration read from mobile/.env at build time.
 *
 * IMPORTANT: every EXPO_PUBLIC_ value is copied into the app bundle, so anyone with the
 * app can read it. Only put public information here (like the server address),
 * never passwords, API keys or the backend's JWT_SECRET.
 */

/** Removes a trailing slash so we can safely write `${API_URL}/path`. */
export function normaliseApiUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value || !/^https?:\/\/[^\s/]+/.test(value)) {
    return null;
  }
  return value.replace(/\/+$/, '');
}

/** The backend address, e.g. http://192.168.1.20:8080, or null if not configured. */
export const API_URL = normaliseApiUrl(process.env.EXPO_PUBLIC_API_URL);
