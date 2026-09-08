"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  courseSearchEnabled,
  searchCourses,
  type CourseSearchResult,
} from "./course-search";

const DEBOUNCE_MS = 300;

interface Coords {
  lat: number;
  lng: number;
}

/** One-shot, cached geolocation lookup. Resolves to null if unavailable/denied. */
function useCoords(): Coords | null {
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!cancelled) {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      },
      () => {
        /* denied / unavailable — search still works without a location bias */
      },
      { maximumAge: 10 * 60 * 1000, timeout: 8000 },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return coords;
}

export interface CourseSearchState {
  results: CourseSearchResult[];
  loading: boolean;
  enabled: boolean;
}

/**
 * Debounced course typeahead. Feeds `query` to course-ls, cancels in-flight
 * requests when the query changes, and biases by the user's location if granted.
 */
export function useCourseSearch(query: string): CourseSearchState {
  const coords = useCoords();
  const [results, setResults] = useState<CourseSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (q: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const next = await searchCourses(q, {
          lat: coords?.lat,
          lng: coords?.lng,
          signal: controller.signal,
        });
        setResults(next);
      } catch {
        /* aborted — a newer query is in flight */
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    },
    [coords?.lat, coords?.lng],
  );

  useEffect(() => {
    if (!courseSearchEnabled || query.trim().length < 2) {
      abortRef.current?.abort();
      setResults([]);
      setLoading(false);
      return;
    }
    const handle = setTimeout(() => void run(query), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, run]);

  return { results, loading, enabled: courseSearchEnabled };
}
