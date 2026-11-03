/**
 * Types and helpers for the safety map API (GET /api/v1/incidents).
 * Must match the backend's IncidentResponse and BoundingBox.
 */

export type IncidentCategory = 'HARASSMENT' | 'STALKING' | 'POOR_LIGHTING' | 'UNSAFE_CROWD' | 'OTHER';

export type Incident = {
  id: string;
  category: IncidentCategory;
  description: string | null;
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
