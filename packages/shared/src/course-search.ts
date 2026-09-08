/**
 * Contract for the course-ls service: golf-course typeahead search backed by
 * the Google Places API. Consumed by `apps/web` (the new-course form) and
 * served by `services/course-ls`.
 */

export interface CourseSearchResult {
  /** Google Place id — stable identifier for the course. */
  placeId: string;
  name: string;
  /** Google formatted address, for disambiguating similarly named courses. */
  address: string;
  location: { lat: number; lng: number };
  /** Great-circle distance from the requested lat/lng, when one was given. */
  distanceKm?: number;
}

export type CourseSearchSource = "edge" | "kv" | "google";

export interface CourseSearchResponse {
  /** The normalised query the results are for. */
  query: string;
  results: CourseSearchResult[];
  /** True when served from a cache layer without calling Google. */
  cached: boolean;
  source: CourseSearchSource;
}
