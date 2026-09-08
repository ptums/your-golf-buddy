/**
 * Query + location normalisation. The goal is cache-key stability: many
 * slightly different requests ("  Pebble  Beach ", "pebble beach", a GPS fix a
 * few metres away) should collapse to one key so the cache hit rate stays high.
 */

export const MIN_QUERY_LENGTH = 2;
export const MAX_RADIUS_M = 50_000; // Google's hard limit for locationBias
export const DEFAULT_RADIUS_M = 40_000;

export function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 120);
}

/**
 * Round coordinates onto a grid so nearby users share cache entries.
 * precision 2 ≈ 1.1 km cells; precision 1 ≈ 11 km.
 */
export function geoBucket(
  lat: number | undefined,
  lng: number | undefined,
  precision = 2,
): string {
  if (
    lat === undefined ||
    lng === undefined ||
    Number.isNaN(lat) ||
    Number.isNaN(lng)
  ) {
    return "nogeo";
  }
  return `${lat.toFixed(precision)},${lng.toFixed(precision)}`;
}

/** Snap an arbitrary radius to a few discrete buckets. */
export function radiusBucket(meters: number | undefined): number {
  const m = meters && meters > 0 ? Math.min(meters, MAX_RADIUS_M) : DEFAULT_RADIUS_M;
  if (m <= 10_000) return 10_000;
  if (m <= 25_000) return 25_000;
  return MAX_RADIUS_M;
}

export interface SearchParams {
  query: string;
  lat?: number;
  lng?: number;
  radiusM: number;
}

export function parseSearchParams(url: URL): SearchParams | { error: string } {
  const rawQuery = url.searchParams.get("q") ?? "";
  const query = normalizeQuery(rawQuery);
  if (query.length < MIN_QUERY_LENGTH) {
    return { error: `q must be at least ${MIN_QUERY_LENGTH} characters` };
  }

  const latRaw = url.searchParams.get("lat");
  const lngRaw = url.searchParams.get("lng");
  let lat: number | undefined;
  let lng: number | undefined;
  if (latRaw !== null && lngRaw !== null) {
    lat = Number.parseFloat(latRaw);
    lng = Number.parseFloat(lngRaw);
    if (
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return { error: "invalid lat/lng" };
    }
  }

  const radiusRaw = url.searchParams.get("radius");
  const radiusM = radiusBucket(
    radiusRaw ? Number.parseInt(radiusRaw, 10) : undefined,
  );

  return { query, lat, lng, radiusM };
}

export function cacheKey(p: SearchParams): string {
  return `cls:v1:${p.query}:${geoBucket(p.lat, p.lng)}:${p.radiusM}`;
}
