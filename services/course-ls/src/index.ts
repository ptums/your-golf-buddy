import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import type { CourseSearchResponse, CourseSearchResult } from "@ygb/shared";
import { readCache, writeCache } from "./cache";
import { GoogleApiError, searchGolfCourses } from "./google";
import { cacheKey, parseSearchParams, type SearchParams } from "./normalize";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.get("/health", (c) =>
  c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "course-location-service",
  }),
);

/**
 * Golf-course typeahead. The web client debounces keystrokes and calls this
 * with the partial query plus (optionally) the user's location.
 *
 *   GET /courses/search?q=pebb&lat=36.57&lng=-121.95&radius=40000
 *
 * Latency path: Cache API → KV → Google. Cache hits return immediately and,
 * if the entry is going stale, kick off a background refresh (SWR).
 */
app.get("/courses/search", async (c) => {
  const parsed = parseSearchParams(new URL(c.req.url));
  if ("error" in parsed) {
    return c.json({ error: parsed.error }, 400);
  }

  const key = cacheKey(parsed);
  const kv = c.env.COURSE_CACHE;
  const apiKey = c.env.GOOGLE_MAPS_API_KEY;

  const hit = await readCache(key, kv);
  if (hit) {
    if (hit.stale && apiKey) {
      c.executionCtx.waitUntil(revalidate(apiKey, parsed, key, kv));
    } else if (hit.source === "kv") {
      c.executionCtx.waitUntil(
        writeCache(key, hit.results, kv, { edgeOnly: true }),
      );
    }
    return respond(c, {
      query: parsed.query,
      results: hit.results,
      cached: true,
      source: hit.source,
    });
  }

  if (!apiKey) {
    return c.json(
      { error: "search unavailable: GOOGLE_MAPS_API_KEY is not configured" },
      503,
    );
  }

  let results: CourseSearchResult[];
  try {
    results = await searchGolfCourses(apiKey, parsed);
  } catch (err) {
    if (err instanceof GoogleApiError) {
      console.error("google places", err.status, err.message);
      return c.json({ error: "upstream search failed" }, 502);
    }
    throw err;
  }

  c.executionCtx.waitUntil(writeCache(key, results, kv));
  return respond(c, {
    query: parsed.query,
    results,
    cached: false,
    source: "google",
  });
});

app.onError((err, c) => {
  console.error("course-ls error:", err);
  return c.json(
    {
      error: "Internal server error",
      message: err instanceof Error ? err.message : "Unknown error",
    },
    500,
  );
});

function respond(c: Context<{ Bindings: Env }>, body: CourseSearchResponse) {
  // Browser + any CDN in front: short private-ish freshness, long SWR window.
  c.header(
    "Cache-Control",
    "public, max-age=120, s-maxage=600, stale-while-revalidate=86400",
  );
  return c.json(body);
}

async function revalidate(
  apiKey: string,
  params: SearchParams,
  key: string,
  kv: KVNamespace | undefined,
): Promise<void> {
  try {
    const results = await searchGolfCourses(apiKey, params);
    await writeCache(key, results, kv);
  } catch (err) {
    console.error("course-ls background revalidate failed:", err);
  }
}

export default app;
