import type { CourseSearchResult } from "@ygb/shared";
import { distanceKm } from "./geo";
import type { SearchParams } from "./normalize";

const PLACES_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

// Minimal field mask — keeps the request in the cheaper "Pro" SKU and the
// response small. `places.types` is used to double-check the result is a course.
const FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.location,places.types";

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
}
interface GoogleResponse {
  places?: GooglePlace[];
  error?: { message?: string };
}

const GOLF_TYPES = new Set([
  "golf_course",
  "country_club",
  "indoor_golf_course",
  "public_golf_course",
]);

export class GoogleApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GoogleApiError";
  }
}

export async function searchGolfCourses(
  apiKey: string,
  params: SearchParams,
  signal?: AbortSignal,
): Promise<CourseSearchResult[]> {
  const body: Record<string, unknown> = {
    textQuery: params.query,
    includedType: "golf_course",
    pageSize: 8,
    languageCode: "en",
  };

  if (params.lat !== undefined && params.lng !== undefined) {
    body.locationBias = {
      circle: {
        center: { latitude: params.lat, longitude: params.lng },
        radius: params.radiusM,
      },
    };
    body.rankPreference = "DISTANCE";
  }

  const res = await fetch(PLACES_ENDPOINT, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as GoogleResponse;
  if (!res.ok) {
    throw new GoogleApiError(
      data.error?.message ?? `Places API error ${res.status}`,
      res.status,
    );
  }

  return (data.places ?? [])
    .filter(
      (p) =>
        p.id &&
        p.location?.latitude !== undefined &&
        (!p.types || p.types.some((t) => GOLF_TYPES.has(t))),
    )
    .map((p): CourseSearchResult => {
      const lat = p.location!.latitude!;
      const lng = p.location!.longitude!;
      const result: CourseSearchResult = {
        placeId: p.id!,
        name: p.displayName?.text ?? "",
        address: p.formattedAddress ?? "",
        location: { lat, lng },
      };
      if (params.lat !== undefined && params.lng !== undefined) {
        result.distanceKm = distanceKm(params.lat, params.lng, lat, lng);
      }
      return result;
    });
}
