import { checkHealth, describeHealth } from '@/api/health';
import { normaliseApiUrl } from '@/config/env';

/** Builds a fake fetch that returns the given HTTP status and JSON body. */
function fakeFetch(status: number, body: unknown): typeof fetch {
  return (async () =>
    ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response) as typeof fetch;
}

describe('normaliseApiUrl', () => {
  it('accepts http and https addresses and removes trailing slashes', () => {
    expect(normaliseApiUrl('http://192.168.1.20:8080/')).toBe('http://192.168.1.20:8080');
    expect(normaliseApiUrl(' https://api.example.com ')).toBe('https://api.example.com');
  });

  it('rejects missing or malformed values', () => {
    expect(normaliseApiUrl(undefined)).toBeNull();
    expect(normaliseApiUrl('')).toBeNull();
    expect(normaliseApiUrl('192.168.1.20:8080')).toBeNull();
  });
});

describe('checkHealth', () => {
  const url = 'http://192.168.1.20:8080';

  it('reports up when the server says UP', async () => {
    await expect(checkHealth(url, 1000, fakeFetch(200, { status: 'UP' }))).resolves.toEqual({ kind: 'up' });
  });

  it('reports down when the server answers with an error', async () => {
    await expect(checkHealth(url, 1000, fakeFetch(503, { status: 'DOWN' }))).resolves.toEqual({
      kind: 'down',
      httpStatus: 503,
    });
  });

  it('reports unreachable on a network error', async () => {
    const failing = (async () => {
      throw new TypeError('Network request failed');
    }) as typeof fetch;
    await expect(checkHealth(url, 1000, failing)).resolves.toEqual({ kind: 'unreachable' });
  });

  it('reports timeout when the server never answers', async () => {
    const hanging = ((_: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      })) as typeof fetch;
    await expect(checkHealth(url, 50, hanging)).resolves.toEqual({ kind: 'timeout' });
  });

  it('reports not-configured without calling the network', async () => {
    const neverCalled = jest.fn() as unknown as typeof fetch;
    await expect(checkHealth(null, 1000, neverCalled)).resolves.toEqual({ kind: 'not-configured' });
    expect(neverCalled).not.toHaveBeenCalled();
  });

  it('has a human-readable message for every result', () => {
    for (const kind of ['up', 'timeout', 'unreachable', 'not-configured'] as const) {
      expect(describeHealth({ kind })).not.toHaveLength(0);
    }
    expect(describeHealth({ kind: 'down', httpStatus: 500 })).toContain('500');
  });
});
