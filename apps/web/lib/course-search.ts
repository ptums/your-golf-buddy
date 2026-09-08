import type { CourseSearchResponse, CourseSearchResult } from "@ygb/shared";

const ENDPOINT = process.env.NEXT_PUBLIC_COURSE_LS_ENDPOINT?.replace(/\/$/, "");

export type { CourseSearchResult };

export interface CourseSearchOptions {
  lat?: number;
  lng?: number;
  signal?: AbortSignal;
}

/**
 * Query the course-ls service. Returns `[]` (never throws) when the service is
 * unconfigured, unreachable, or returns an error — the new-course form stays
 * usable as a plain text field in that case.
 */
export async function searchCourses(
  query: string,
  { lat, lng, signal }: CourseSearchOptions = {},
): Promise<CourseSearchResult[]> {
  const q = query.trim();
  if (!ENDPOINT || q.length < 2) return [];

  const params = new URLSearchParams({ q });
  if (lat !== undefined && lng !== undefined) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }

  try {
    const res = await fetch(`${ENDPOINT}/courses/search?${params}`, { signal });
    if (!res.ok) return [];
    const body = (await res.json()) as CourseSearchResponse;
    return body.results ?? [];
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    return [];
  }
}

export const courseSearchEnabled = Boolean(ENDPOINT);
