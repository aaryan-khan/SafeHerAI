import type { Incident } from '@/api/incidents';

/** Free OpenStreetMap vector tiles, no API key. Attribution is shown by the map's (i) button. */
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

/** Where the map starts when we don't know the user's location: central Mumbai. */
export const DEFAULT_CENTER: [number, number] = [72.8777, 19.076];
export const DEFAULT_ZOOM = 11.5;

/** The incidents as GeoJSON points, which the map draws in one fast native layer. */
export function toFeatureCollection(incidents: Incident[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: incidents.map((incident) => ({
      type: 'Feature',
      id: incident.id,
      geometry: { type: 'Point', coordinates: [incident.longitude, incident.latitude] },
      properties: {
        id: incident.id,
        category: incident.category,
        verified: incident.verificationStatus === 'VERIFIED',
      },
    })),
  };
}

/** "5 min ago", "3 h ago", "2 days ago", or a date for anything older than 30 days. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (Number.isNaN(minutes)) return 'Unknown time';
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return days === 1 ? '1 day ago' : `${days} days ago`;
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** The line under the map title. */
export function reportCountLabel(count: number, truncated: boolean): string {
  if (count === 0) return 'No reports in this area';
  const base = count === 1 ? '1 report in this area' : `${count} reports in this area`;
  return truncated ? `${base} · zoom in to see all` : base;
}
