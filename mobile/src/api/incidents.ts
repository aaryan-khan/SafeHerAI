/**
 * Types and helpers for the safety map API (GET /api/v1/incidents).
 * Must match the backend's IncidentResponse and BoundingBox.
 */

export type IncidentCategory = 'HARASSMENT' | 'STALKING' | 'POOR_LIGHTING' | 'UNSAFE_CROWD' | 'OTHER';

export type Incident = {
  id: string;
  category: IncidentCategory;
  /** Only filled in once a moderator has approved the text. */
  description: string | null;
  /** True when the reporter wrote details that a moderator hasn't checked yet. */
  descriptionPending: boolean;
  latitude: number;
  longitude: number;
  occurredAt: string;
  verificationStatus: 'UNVERIFIED' | 'VERIFIED';
  /** Made-up test data. Always shown with a DEMO label. */
  isDemo: boolean;
};

export type IncidentPage = {
  items: Incident[];
  /** True when the area had more incidents than the server returns at once. */
  truncated: boolean;
};

export type ModerationStatus = 'VISIBLE' | 'HIDDEN';

/** One of the user's OWN reports: exact location, full text, and its moderation state. */
export type OwnIncident = {
  id: string;
  category: IncidentCategory;
  description: string | null;
  descriptionApproved: boolean;
  latitude: number;
  longitude: number;
  occurredAt: string;
  verificationStatus: 'UNVERIFIED' | 'VERIFIED';
  moderationStatus: ModerationStatus;
  createdAt: string;
};

/** What the app sends to report an incident. The server decides everything else. */
export type NewReport = {
  category: IncidentCategory;
  description?: string;
  latitude: number;
  longitude: number;
  occurredAt: string;
};

/** Must match CreateIncidentRequest on the server. */
export const DESCRIPTION_MAX = 500;

/**
 * "When did it happen?" choices. Approximate on purpose: people rarely know the exact minute,
 * and a rough time is enough for the map.
 */
export const WHEN_OPTIONS = [
  { key: 'now', label: 'Just now', minutesAgo: 0 },
  { key: 'lastHour', label: 'In the last hour', minutesAgo: 30 },
  { key: 'fewHours', label: 'A few hours ago', minutesAgo: 180 },
  { key: 'yesterday', label: 'Yesterday', minutesAgo: 24 * 60 },
  { key: 'thisWeek', label: 'In the last week', minutesAgo: 4 * 24 * 60 },
] as const;

export type WhenKey = (typeof WHEN_OPTIONS)[number]['key'];

export function occurredAtFor(key: WhenKey, now: Date = new Date()): string {
  const option = WHEN_OPTIONS.find((o) => o.key === key) ?? WHEN_OPTIONS[0];
  return new Date(now.getTime() - option.minutesAgo * 60_000).toISOString();
}

/** A rectangle of map, in degrees. */
export type MapArea = { minLon: number; minLat: number; maxLon: number; maxLat: number };

/** The backend rejects areas wider or taller than this (BoundingBox.MAX_SPAN_DEGREES). */
export const MAX_AREA_SPAN_DEGREES = 1.0;

/** MapLibre gives bounds as [west, south, east, north]. */
export function areaFromBounds([west, south, east, north]: readonly number[]): MapArea {
  return { minLon: west, minLat: south, maxLon: east, maxLat: north };
}

/** True if the server would refuse this area, so we ask the user to zoom in instead of calling it. */
export function isAreaTooLarge(area: MapArea): boolean {
  return area.maxLon - area.minLon > MAX_AREA_SPAN_DEGREES || area.maxLat - area.minLat > MAX_AREA_SPAN_DEGREES;
}

/** 5 decimal places is about 1 metre: precise enough, and keeps URLs short. */
const round = (value: number) => value.toFixed(5);

export function incidentsPath(area: MapArea): string {
  return (
    `/api/v1/incidents?minLon=${round(area.minLon)}&minLat=${round(area.minLat)}` +
    `&maxLon=${round(area.maxLon)}&maxLat=${round(area.maxLat)}`
  );
}
