import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CourseSearchResponse } from "@ygb/shared";
import app from "../src/index";

const GOOGLE_PLACES = {
  places: [
    {
      id: "place-pebble",
      displayName: { text: "Pebble Beach Golf Links" },
      formattedAddress: "1700 17-Mile Dr, Pebble Beach, CA 93953",
      location: { latitude: 36.5686, longitude: -121.9497 },
      types: ["golf_course"],
    },
    {
      id: "place-spyglass",
      displayName: { text: "Spyglass Hill Golf Course" },
      formattedAddress: "Spyglass Hill Rd, Pebble Beach, CA 93953",
      location: { latitude: 36.5847, longitude: -121.9564 },
      types: ["golf_course"],
    },
  ],
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("places.googleapis.com")) {
      return new Response(JSON.stringify(GOOGLE_PLACES), {
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function search(qs: string): Promise<Response> {
  const ctx = createExecutionContext();
  const res = await app.fetch(
    new Request(`https://course-ls.test/courses/search?${qs}`),
    env,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return res;
}

describe("course-ls", () => {
  it("GET /health", async () => {
    const res = await app.fetch(
      new Request("https://course-ls.test/health"),
      env,
      createExecutionContext(),
    );
    expect(res.status).toBe(200);
  });

  it("rejects a too-short query", async () => {
    const res = await search("q=a");
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("searches Google on a cache miss and maps + ranks results", async () => {
    const res = await search("q=pebble beach&lat=36.57&lng=-121.95");
    expect(res.status).toBe(200);
    const body = await res.json<CourseSearchResponse>();

    expect(body.source).toBe("google");
    expect(body.cached).toBe(false);
    expect(body.results).toHaveLength(2);
    expect(body.results[0]).toMatchObject({
      placeId: "place-pebble",
      name: "Pebble Beach Golf Links",
      address: expect.stringContaining("Pebble Beach"),
    });
    expect(body.results[0]!.distanceKm).toBeGreaterThanOrEqual(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // the Places request used field masking + the golf type filter
    const [, init] = fetchMock.mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({
      "X-Goog-FieldMask": expect.stringContaining("places.id"),
    });
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
      includedType: "golf_course",
      rankPreference: "DISTANCE",
    });
  });

  it("serves the second identical request from cache without calling Google", async () => {
    await search("q=augusta&lat=33.50&lng=-82.02");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const res = await search("q=augusta&lat=33.50&lng=-82.02");
    const body = await res.json<CourseSearchResponse>();
    expect(body.cached).toBe(true);
    expect(["edge", "kv"]).toContain(body.source);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no new upstream call
  });

  it("normalises whitespace/case so variants share a cache entry", async () => {
    await search("q=St%20Andrews");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const res = await search("q=" + encodeURIComponent("   st   ANDREWS  "));
    const body = await res.json<CourseSearchResponse>();
    expect(body.cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
