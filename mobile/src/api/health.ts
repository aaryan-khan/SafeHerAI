/** Every possible answer to "can the app reach the backend?" */
export type HealthResult =
  | { kind: 'up' }
  | { kind: 'down'; httpStatus: number }
  | { kind: 'timeout' }
  | { kind: 'unreachable' }
  | { kind: 'not-configured' };

/**
 * Asks the backend's public health endpoint whether it is running.
 * Never throws: every failure is turned into a HealthResult the screen can explain.
 */
export async function checkHealth(
  apiUrl: string | null,
  timeoutMs = 5000,
  fetchImpl: typeof fetch = fetch,
): Promise<HealthResult> {
  if (!apiUrl) {
    return { kind: 'not-configured' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${apiUrl}/actuator/health`, { signal: controller.signal });
    if (!response.ok) {
      return { kind: 'down', httpStatus: response.status };
    }
    const body = await response.json();
    return body?.status === 'UP' ? { kind: 'up' } : { kind: 'down', httpStatus: response.status };
  } catch (error) {
    return controller.signal.aborted ? { kind: 'timeout' } : { kind: 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

/** Plain-language explanation for each result, shown on screen. */
export function describeHealth(result: HealthResult): string {
  switch (result.kind) {
    case 'up':
      return 'Connected. The SafeHerAI server is running.';
    case 'down':
      return `The server answered but is not healthy (HTTP ${result.httpStatus}).`;
    case 'timeout':
      return 'The server did not answer in time. Check that the backend is running and that your phone is on the same Wi-Fi as your Mac.';
    case 'unreachable':
      return 'Could not reach the server. Check the address in mobile/.env, that the backend is running, and that your phone is on the same Wi-Fi.';
    case 'not-configured':
      return 'No server address set. Add EXPO_PUBLIC_API_URL to mobile/.env and restart Expo.';
  }
}
