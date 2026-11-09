import { incidentsPath, type IncidentPage, type MapArea, type NewReport, type OwnIncident } from './incidents';
/**
 * Talks to the SafeHerAI backend.
 *
 * Token rules:
 * - The access token (valid 15 min) is kept only in memory.
 * - The refresh token is kept in the phone's secure storage (see tokenStorage.ts).
 * - When the server says the access token is no longer valid (401), we refresh ONCE and retry.
 * - Only one refresh runs at a time. Two parallel refreshes would reuse the same refresh token,
 *   which the backend treats as theft and ends the whole session.
 */

export type Role = 'USER' | 'MODERATOR' | 'ADMIN';

export type User = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: string;
};

type AuthResponse = {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  user: User;
};

export type ApiErrorKind = 'not-configured' | 'network' | 'timeout' | 'http';

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status?: number,
    readonly title?: string,
    readonly detail?: string,
    /** Field name -> problem, from the backend's validation errors. */
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(detail ?? title ?? kind);
  }
}

/** Where the refresh token lives. The real one uses secure storage; tests use memory. */
export interface TokenStore {
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string): Promise<void>;
  clear(): Promise<void>;
}

type Options = {
  baseUrl: string | null;
  tokenStore: TokenStore;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Called when the session can't be renewed and the user must log in again. */
  onSessionExpired?: () => void;
};

type RequestOptions = { method?: string; body?: unknown; accessToken?: string };

export function createApiClient({
  baseUrl,
  tokenStore,
  fetchImpl = fetch,
  timeoutMs = 10_000,
  onSessionExpired,
}: Options) {
  let accessToken: string | null = null;
  let refreshing: Promise<User> | null = null;

  /** One HTTP call. Turns every failure into an ApiError. */
  async function send<T>(path: string, { method = 'GET', body, accessToken: token }: RequestOptions = {}): Promise<T> {
    if (!baseUrl) {
      throw new ApiError('not-configured');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(controller.signal.aborted ? 'timeout' : 'network');
    } finally {
      clearTimeout(timer);
    }

    const text = await response.text();
    const data = text ? safeJson(text) : undefined;
    if (!response.ok) {
      const fieldErrors: Record<string, string> = {};
      for (const e of (data?.errors ?? []) as { field?: string; message?: string }[]) {
        if (e.field && e.message) fieldErrors[e.field] = e.message;
      }
      throw new ApiError('http', response.status, data?.title, data?.detail, fieldErrors);
    }
    return data as T;
  }

  async function startSession(response: AuthResponse): Promise<User> {
    accessToken = response.accessToken;
    await tokenStore.setRefreshToken(response.refreshToken);
    return response.user;
  }

  async function endSessionLocally() {
    accessToken = null;
    await tokenStore.clear();
  }

  /** Gets a fresh token pair. Shared by everyone who needs it at the same moment. */
  function refreshSession(): Promise<User> {
    if (!refreshing) {
      refreshing = (async () => {
        const refreshToken = await tokenStore.getRefreshToken();
        if (!refreshToken) {
          throw new ApiError('http', 401, 'Unauthorized', 'Please log in.');
        }
        try {
          return await startSession(
            await send<AuthResponse>('/api/v1/auth/refresh', { method: 'POST', body: { refreshToken } }),
          );
        } catch (error) {
          // Only a definite "no" from the server ends the session. A network problem does not:
          // we keep the refresh token so the user stays logged in when the connection returns.
          if (error instanceof ApiError && error.kind === 'http' && error.status === 401) {
            await endSessionLocally();
            onSessionExpired?.();
          }
          throw error;
        }
      })().finally(() => {
        refreshing = null;
      });
    }
    return refreshing;
  }

  /** A call that needs the user to be logged in. Refreshes and retries once on 401. */
  async function authed<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!accessToken) {
      await refreshSession();
    }
    try {
      return await send<T>(path, { ...options, accessToken: accessToken ?? undefined });
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'http' && error.status === 401) {
        await refreshSession();
        return send<T>(path, { ...options, accessToken: accessToken ?? undefined });
      }
      throw error;
    }
  }

  return {
    async register(input: { email: string; password: string; displayName: string }): Promise<User> {
      return startSession(await send<AuthResponse>('/api/v1/auth/register', { method: 'POST', body: input }));
    },

    async login(input: { email: string; password: string }): Promise<User> {
      return startSession(await send<AuthResponse>('/api/v1/auth/login', { method: 'POST', body: input }));
    },

    /** On app start: returns the user if a saved session is still valid, or null if there is none. */
    async restoreSession(): Promise<User | null> {
      if (!(await tokenStore.getRefreshToken())) {
        return null;
      }
      return refreshSession();
    },

    me(): Promise<User> {
      return authed<User>('/api/v1/users/me');
    },

    updateDisplayName(displayName: string): Promise<User> {
      return authed<User>('/api/v1/users/me', { method: 'PATCH', body: { displayName } });
    },

    /** Incidents inside a rectangle of map, newest first (at most 300). */
    incidentsInArea(area: MapArea): Promise<IncidentPage> {
      return authed<IncidentPage>(incidentsPath(area));
    },
     reportIncident(report: NewReport): Promise<OwnIncident> {
      return authed<OwnIncident>('/api/v1/incidents', { method: 'POST', body: report });
    },

    async myIncidents(): Promise<OwnIncident[]> {
      return (await authed<{ items: OwnIncident[] }>('/api/v1/incidents/mine')).items;
    },

    async deleteIncident(id: string): Promise<void> {
      await authed<void>(`/api/v1/incidents/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    
    /**
     * Ends the session. Always forgets the tokens on this phone.
     * Returns false if the server could not be told (it then expires on its own within 14 days).
     */
    async logout(): Promise<boolean> {
      const refreshToken = await tokenStore.getRefreshToken();
      let serverConfirmed = true;
      try {
        if (refreshToken) {
          await send('/api/v1/auth/logout', { method: 'POST', body: { refreshToken } });
        }
      } catch {
        serverConfirmed = false;
      } finally {
        await endSessionLocally();
      }
      return serverConfirmed;
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** A friendly, honest message for any API failure. */
export function describeApiError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Something went wrong. Please try again.';
  }
  switch (error.kind) {
    case 'not-configured':
      return 'The app has no server address. Set EXPO_PUBLIC_API_URL in mobile/.env and restart Expo.';
    case 'network':
      return "Can't reach the SafeHerAI server. Check your internet connection and try again.";
    case 'timeout':
      return 'The server took too long to answer. Please try again.';
    case 'http':
      if (error.status === 429) return 'Too many attempts. Please wait a minute and try again.';
      if (error.status !== undefined && error.status >= 500) {
        return 'Something went wrong on the server. Please try again later.';
      }
      return error.detail ?? 'The request could not be completed.';
  }
}
