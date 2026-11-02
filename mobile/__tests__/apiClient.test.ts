import { ApiError, createApiClient, describeApiError, type TokenStore } from '@/api/client';

const BASE = 'http://test-server:8080';
const USER = { id: 'u1', email: 'priya@example.com', displayName: 'Priya', role: 'USER', createdAt: '2026-01-01T00:00:00Z' };

/** A refresh-token store that lives in memory, so tests never touch the phone's real storage. */
function memoryStore(initial: string | null = null): TokenStore & { value: string | null } {
  return {
    value: initial,
    async getRefreshToken() {
      return this.value;
    },
    async setRefreshToken(token: string) {
      this.value = token;
    },
    async clear() {
      this.value = null;
    },
  };
}

type Handler = (url: string, init: RequestInit) => { status: number; body?: unknown } | 'network-error';

/** A fake server: records every call and answers with the handler's response. */
function fakeServer(handler: Handler) {
  const calls: { path: string; init: RequestInit }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ path: url.replace(BASE, ''), init });
    const result = handler(url.replace(BASE, ''), init);
    if (result === 'network-error') throw new TypeError('Network request failed');
    const text = result.body === undefined ? '' : JSON.stringify(result.body);
    return { ok: result.status < 300, status: result.status, text: async () => text } as Response;
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

function tokens(n: number) {
  return { tokenType: 'Bearer', accessToken: `access-${n}`, expiresIn: 900, refreshToken: `refresh-${n}`, user: USER };
}

const auth = (init: RequestInit) => (init.headers as Record<string, string>).Authorization;
const body = (init: RequestInit) => JSON.parse(init.body as string);

describe('api client', () => {
  it('login saves the refresh token and uses the access token for later calls', async () => {
    const store = memoryStore();
    const server = fakeServer((path) =>
      path === '/api/v1/auth/login' ? { status: 200, body: tokens(1) } : { status: 200, body: USER },
    );
    const api = createApiClient({ baseUrl: BASE, tokenStore: store, fetchImpl: server.fetchImpl });

    await expect(api.login({ email: 'priya@example.com', password: 'secret-password-1' })).resolves.toEqual(USER);
    expect(store.value).toBe('refresh-1');

    await api.me();
    expect(auth(server.calls[1].init)).toBe('Bearer access-1');
  });

  it('refreshes once and retries when the access token has expired', async () => {
    const store = memoryStore();
    let meCalls = 0;
    const server = fakeServer((path) => {
      if (path === '/api/v1/auth/login') return { status: 200, body: tokens(1) };
      if (path === '/api/v1/auth/refresh') return { status: 200, body: tokens(2) };
      meCalls += 1;
      return meCalls === 1 ? { status: 401, body: { title: 'Unauthorized' } } : { status: 200, body: USER };
    });
    const api = createApiClient({ baseUrl: BASE, tokenStore: store, fetchImpl: server.fetchImpl });
    await api.login({ email: 'priya@example.com', password: 'secret-password-1' });

    await expect(api.me()).resolves.toEqual(USER);

    const refreshCall = server.calls.find((c) => c.path === '/api/v1/auth/refresh')!;
    expect(body(refreshCall.init)).toEqual({ refreshToken: 'refresh-1' });
    expect(store.value).toBe('refresh-2'); // rotated
    expect(auth(server.calls[server.calls.length - 1].init)).toBe('Bearer access-2');
  });

  it('runs only ONE refresh when several calls need it at the same time', async () => {
    const store = memoryStore('refresh-1');
    const server = fakeServer((path) =>
      path === '/api/v1/auth/refresh' ? { status: 200, body: tokens(2) } : { status: 200, body: USER },
    );
    const api = createApiClient({ baseUrl: BASE, tokenStore: store, fetchImpl: server.fetchImpl });

    await Promise.all([api.me(), api.me(), api.me()]);

    // Two refreshes with the same token would look like theft to the backend and end the session.
    expect(server.calls.filter((c) => c.path === '/api/v1/auth/refresh')).toHaveLength(1);
  });

  it('ends the session when the server rejects the refresh token', async () => {
    const store = memoryStore('refresh-1');
    const onSessionExpired = jest.fn();
    const server = fakeServer(() => ({ status: 401, body: { title: 'Unauthorized' } }));
    const api = createApiClient({ baseUrl: BASE, tokenStore: store, fetchImpl: server.fetchImpl, onSessionExpired });

    await expect(api.restoreSession()).rejects.toMatchObject({ kind: 'http', status: 401 });
    expect(store.value).toBeNull();
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('keeps the session when the phone is offline', async () => {
    const store = memoryStore('refresh-1');
    const onSessionExpired = jest.fn();
    const server = fakeServer(() => 'network-error');
    const api = createApiClient({ baseUrl: BASE, tokenStore: store, fetchImpl: server.fetchImpl, onSessionExpired });

    await expect(api.restoreSession()).rejects.toMatchObject({ kind: 'network' });
    expect(store.value).toBe('refresh-1');
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('restoreSession returns null without calling the server when nothing is saved', async () => {
    const server = fakeServer(() => ({ status: 200, body: tokens(1) }));
    const api = createApiClient({ baseUrl: BASE, tokenStore: memoryStore(), fetchImpl: server.fetchImpl });

    await expect(api.restoreSession()).resolves.toBeNull();
    expect(server.calls).toHaveLength(0);
  });

  it('logout tells the server and forgets the tokens', async () => {
    const store = memoryStore('refresh-1');
    const server = fakeServer(() => ({ status: 204 }));
    const api = createApiClient({ baseUrl: BASE, tokenStore: store, fetchImpl: server.fetchImpl });

    await expect(api.logout()).resolves.toBe(true);
    expect(body(server.calls[0].init)).toEqual({ refreshToken: 'refresh-1' });
    expect(store.value).toBeNull();
  });

  it('logout still forgets the tokens when offline, and says the server was not told', async () => {
    const store = memoryStore('refresh-1');
    const api = createApiClient({ baseUrl: BASE, tokenStore: store, fetchImpl: fakeServer(() => 'network-error').fetchImpl });

    await expect(api.logout()).resolves.toBe(false);
    expect(store.value).toBeNull();
  });

  it('turns backend validation errors into per-field messages', async () => {
    const server = fakeServer(() => ({
      status: 400,
      body: { title: 'Validation failed', errors: [{ field: 'email', message: 'must be a well-formed email address' }] },
    }));
    const api = createApiClient({ baseUrl: BASE, tokenStore: memoryStore(), fetchImpl: server.fetchImpl });

    await expect(api.register({ email: 'x', password: 'p', displayName: 'n' })).rejects.toMatchObject({
      status: 400,
      fieldErrors: { email: 'must be a well-formed email address' },
    });
  });

  it('fails clearly when no server address is configured', async () => {
    const api = createApiClient({ baseUrl: null, tokenStore: memoryStore() });
    await expect(api.login({ email: 'a@b.co', password: 'x' })).rejects.toMatchObject({ kind: 'not-configured' });
  });
});

describe('describeApiError', () => {
  it('gives plain-language messages', () => {
    expect(describeApiError(new ApiError('network'))).toContain("Can't reach");
    expect(describeApiError(new ApiError('timeout'))).toContain('too long');
    expect(describeApiError(new ApiError('http', 429))).toContain('Too many attempts');
    expect(describeApiError(new ApiError('http', 500))).toContain('server');
    expect(describeApiError(new ApiError('http', 409, 'Conflict', 'An account with this email already exists.'))).toBe(
      'An account with this email already exists.',
    );
    expect(describeApiError(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
});
