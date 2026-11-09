import { createApiClient, type TokenStore } from '@/api/client';
import { areaFromBounds, incidentsPath, isAreaTooLarge, occurredAtFor, type Incident } from '@/api/incidents';
import { reportCountLabel, timeAgo, toFeatureCollection } from '@/map/mapData';

const INCIDENT: Incident = {
  id: 'i1',
  category: 'POOR_LIGHTING',
  description: 'DEMO: made-up report',
  descriptionPending: false,
  latitude: 19.07,
  longitude: 72.88,
  occurredAt: '2026-11-01T10:00:00Z',
  verificationStatus: 'VERIFIED',
  isDemo: true,
};

describe('map areas', () => {
  it('reads MapLibre bounds in [west, south, east, north] order', () => {
    expect(areaFromBounds([72.8, 19.0, 72.9, 19.1])).toEqual({ minLon: 72.8, minLat: 19.0, maxLon: 72.9, maxLat: 19.1 });
  });

  it('knows which areas the server would refuse as too large', () => {
    expect(isAreaTooLarge({ minLon: 72.75, minLat: 18.88, maxLon: 73.0, maxLat: 19.28 })).toBe(false); // Mumbai
    expect(isAreaTooLarge({ minLon: 68, minLat: 8, maxLon: 97, maxLat: 37 })).toBe(true); // India
  });

  it('builds the request path with rounded coordinates', () => {
    expect(incidentsPath({ minLon: 72.8123456789, minLat: 19, maxLon: 72.9, maxLat: 19.1 })).toBe(
      '/api/v1/incidents?minLon=72.81235&minLat=19.00000&maxLon=72.90000&maxLat=19.10000',
    );
  });
});

describe('map data', () => {
  it('turns incidents into GeoJSON points with [longitude, latitude]', () => {
    const collection = toFeatureCollection([INCIDENT]);
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0].geometry.coordinates).toEqual([72.88, 19.07]);
    expect(collection.features[0].properties).toEqual({ id: 'i1', category: 'POOR_LIGHTING', verified: true });
  });

  it('says how long ago something happened', () => {
    const now = new Date('2026-11-03T12:00:00Z');
    expect(timeAgo('2026-11-03T11:59:40Z', now)).toBe('Just now');
    expect(timeAgo('2026-11-03T11:15:00Z', now)).toBe('45 min ago');
    expect(timeAgo('2026-11-03T07:00:00Z', now)).toBe('5 h ago');
    expect(timeAgo('2026-11-02T10:00:00Z', now)).toBe('1 day ago');
    expect(timeAgo('2026-10-20T12:00:00Z', now)).toBe('14 days ago');
    expect(timeAgo('2026-01-05T12:00:00Z', now)).toMatch(/2026/);
    expect(timeAgo('not a date', now)).toBe('Unknown time');
  });

  it('describes how many reports are shown', () => {
    expect(reportCountLabel(0, false)).toBe('No reports in this area');
    expect(reportCountLabel(1, false)).toBe('1 report in this area');
    expect(reportCountLabel(300, true)).toBe('300 reports in this area · zoom in to see all');
  });
});

describe('api client: incidents', () => {
  it('asks for the visible area with the access token', async () => {
    const store: TokenStore = {
      getRefreshToken: async () => 'refresh-1',
      setRefreshToken: async () => {},
      clear: async () => {},
    };
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      const body = url.includes('/auth/refresh')
        ? { tokenType: 'Bearer', accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-2', user: {} }
        : { items: [INCIDENT], truncated: false };
      return { ok: true, status: 200, text: async () => JSON.stringify(body) } as Response;
    }) as unknown as typeof fetch;
    const api = createApiClient({ baseUrl: 'http://test-server:8080', tokenStore: store, fetchImpl });

    const page = await api.incidentsInArea({ minLon: 72.8, minLat: 19, maxLon: 72.9, maxLat: 19.1 });

    expect(page.items[0].id).toBe('i1');
    const last = calls[calls.length - 1];
    expect(last.url).toBe(
      'http://test-server:8080/api/v1/incidents?minLon=72.80000&minLat=19.00000&maxLon=72.90000&maxLat=19.10000',
    );
    expect((last.init.headers as Record<string, string>).Authorization).toBe('Bearer access-1');
  });
});


describe('report times', () => {
  it('turns "when" choices into approximate times', () => {
    const now = new Date('2026-11-04T12:00:00Z');
    expect(occurredAtFor('now', now)).toBe('2026-11-04T12:00:00.000Z');
    expect(occurredAtFor('fewHours', now)).toBe('2026-11-04T09:00:00.000Z');
    expect(occurredAtFor('yesterday', now)).toBe('2026-11-03T12:00:00.000Z');
  });
});

describe('api client: own reports', () => {
  function client(respond: (url: string, init: RequestInit) => { status: number; body?: unknown }) {
    const calls: { url: string; init: RequestInit }[] = [];
    const store: TokenStore = { getRefreshToken: async () => 'r', setRefreshToken: async () => {}, clear: async () => {} };
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      const answer = url.includes('/auth/refresh')
        ? { status: 200, body: { tokenType: 'Bearer', accessToken: 'a', expiresIn: 900, refreshToken: 'r2', user: {} } }
        : respond(url, init);
      const text = answer.body === undefined ? '' : JSON.stringify(answer.body);
      return { ok: answer.status < 300, status: answer.status, text: async () => text } as Response;
    }) as unknown as typeof fetch;
    return { calls, api: createApiClient({ baseUrl: 'http://s', tokenStore: store, fetchImpl }) };
  }

  it('sends a report as JSON and lists and deletes own reports', async () => {
    const { calls, api } = client((url, init) =>
      init.method === 'POST'
        ? { status: 201, body: { id: 'n1' } }
        : init.method === 'DELETE'
          ? { status: 204 }
          : { status: 200, body: { items: [{ id: 'n1' }] } },
    );

    await api.reportIncident({ category: 'OTHER', latitude: 19, longitude: 72.8, occurredAt: '2026-11-04T12:00:00Z' });
    const post = calls[calls.length - 1];
    expect(post.url).toBe('http://s/api/v1/incidents');
    expect(JSON.parse(post.init.body as string)).toEqual({
      category: 'OTHER',
      latitude: 19,
      longitude: 72.8,
      occurredAt: '2026-11-04T12:00:00Z',
    });

    await expect(api.myIncidents()).resolves.toEqual([{ id: 'n1' }]);
    expect(calls[calls.length - 1].url).toBe('http://s/api/v1/incidents/mine');

    await expect(api.deleteIncident('n1')).resolves.toBeUndefined();
    expect(calls[calls.length - 1]).toMatchObject({ url: 'http://s/api/v1/incidents/n1', init: { method: 'DELETE' } });
  });
});