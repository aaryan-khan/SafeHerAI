import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, createApiClient, type User } from '@/api/client';
import type { IncidentPage, MapArea } from '@/api/incidents';
import { secureTokenStore } from '@/auth/tokenStorage';
import { API_URL } from '@/config/env';

/**
 * loading   - checking for a saved session when the app starts
 * signedOut - no session; `notice` explains why if it ended unexpectedly
 * signedIn  - logged in
 * offline   - a saved session exists but the server can't be reached right now
 */
export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut'; notice?: string }
  | { status: 'signedIn'; user: User }
  | { status: 'offline' };

type AuthContextValue = {
  state: AuthState;
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string, displayName: string): Promise<void>;
  logout(): Promise<void>;
  reloadProfile(): Promise<void>;
  updateDisplayName(displayName: string): Promise<void>;
  retry(): Promise<void>;
  /** Logged-in API calls live here because they share the session's tokens. */
  incidentsInArea(area: MapArea): Promise<IncidentPage>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const api = useMemo(
    () =>
      createApiClient({
        baseUrl: API_URL,
        tokenStore: secureTokenStore,
        onSessionExpired: () =>
          setState({ status: 'signedOut', notice: 'Your session has ended. Please log in again.' }),
      }),
    [],
  );

  const restore = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const user = await api.restoreSession();
      setState(user ? { status: 'signedIn', user } : { status: 'signedOut' });
    } catch (error) {
      const offline = error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout');
      // On a 401, onSessionExpired has already set the signedOut notice.
      setState((current) => (offline ? { status: 'offline' } : current.status === 'loading' ? { status: 'signedOut' } : current));
    }
  }, [api]);

  useEffect(() => {
    restore();
  }, [restore]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      async login(email, password) {
        const user = await api.login({ email: email.trim(), password });
        setState({ status: 'signedIn', user });
      },
      async register(email, password, displayName) {
        const user = await api.register({ email: email.trim(), password, displayName: displayName.trim() });
        setState({ status: 'signedIn', user });
      },
      async logout() {
        const serverConfirmed = await api.logout();
        setState({
          status: 'signedOut',
          notice: serverConfirmed
            ? 'You have been logged out.'
            : "Logged out on this phone. The server couldn't be reached, so that session will expire on its own.",
        });
      },
      async reloadProfile() {
        const user = await api.me();
        setState({ status: 'signedIn', user });
      },
      async updateDisplayName(displayName) {
        const user = await api.updateDisplayName(displayName.trim());
        setState({ status: 'signedIn', user });
      },
      retry: restore,
      incidentsInArea: (area) => api.incidentsInArea(area),
    }),
    [api, restore, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return value;
}
