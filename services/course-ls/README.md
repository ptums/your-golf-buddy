# Your Golf Buddy — Course Location Service (Course LS)

A thin Cloudflare Worker that wraps the **Google Places API (New)** to power the
golf-course typeahead in the web app. The client debounces keystrokes and calls
`/courses/search`; this service does the Google lookup once and then serves
everyone else from cache.

**Status:** ✅ Functional (needs a Google Places API key configured).

## Stack

| Concern      | Choice                                            |
| ------------ | ------------------------------------------------ |
| Runtime      | Cloudflare Workers                               |
| Router       | Hono 4                                           |
| Upstream     | Google Places API (New) — Text Search            |
| Cache        | Cloudflare Cache API (per-colo) + Workers KV (global) |
| Contract     | `CourseSearchResponse` from `@ygb/shared`        |
| Tests        | Vitest + `@cloudflare/vitest-pool-workers` (Google mocked) |

## API

### `GET /health`

```json
{ "status": "healthy", "timestamp": "...", "service": "course-location-service" }
```

### `GET /courses/search`

| Query    | Required | Notes                                                     |
| -------- | -------- | ------------------------------------------------------- |
| `q`      | yes      | partial course name, ≥ 2 chars (trimmed, case-insensitive) |
| `lat`    | no       | user latitude — adds a location bias and distance ranking |
| `lng`    | no       | user longitude                                           |
| `radius` | no       | metres, default 40 000, snapped to 10 / 25 / 50 km buckets |

```jsonc
// GET /courses/search?q=pebb&lat=36.57&lng=-121.95
{
  "query": "pebb",
  "results": [
    {
      "placeId": "ChIJ…",
      "name": "Pebble Beach Golf Links",
      "address": "1700 17-Mile Dr, Pebble Beach, CA 93953",
      "location": { "lat": 36.5686, "lng": -121.9497 },
      "distanceKm": 0.4
    }
  ],
  "cached": true,
  "source": "edge"   // "edge" | "kv" | "google"
}
```

Errors: `400` (bad params), `502` (Google failed), `503`
(`GOOGLE_MAPS_API_KEY` not set).

## How the caching works

```
request ─▶ normalise q + bucket lat/lng (~1 km grid) + bucket radius  ──▶ cache key
        ─▶ Cache API (caches.default, per-colo, ~0 ms)   hit? └▶ return; if stale, refresh in background (waitUntil)
        ─▶ Workers KV (global, ~ms)                       hit? └▶ return + warm the edge
        ─▶ Google Places Text Search (New)                     └▶ map, write KV + edge, return
```

- **Field masking** (`places.id,displayName,formattedAddress,location,types`)
  keeps the Google request in the cheaper SKU and the payload small.
- **Normalisation** — `"  Pebble  Beach "` and `"pebble beach"` collapse to one
  key; nearby users share an entry because coordinates are rounded to a grid.
- **Stale-while-revalidate** — a cache hit always returns immediately; if the
  entry is older than 15 min the Worker refreshes it in the background.
- **Response headers** — `Cache-Control: public, max-age=120, s-maxage=600,
  stale-while-revalidate=86400` so the browser and any CDN also cache.
- TTLs: edge 1 h, KV 7 days (golf courses barely change).

Not done: in-flight request coalescing (a burst of identical misses in one colo
each call Google once). The client debounce + edge cache cover the realistic
case; a Durable Object could dedupe if it ever matters.

## Develop

```bash
cp .dev.vars.example .dev.vars   # add a Google Places API key
pnpm --filter course-ls dev      # wrangler dev on :8787
pnpm --filter course-ls test
```

```bash
curl "http://localhost:8787/courses/search?q=pebble%20beach&lat=36.57&lng=-121.95"
```

Without a key the service still runs — `/courses/search` returns `503` and the
web form falls back to free-text entry.

## Deploy

Needs two things set up once (see [`docs/deploy.md`](../../docs/deploy.md)):

1. `wrangler kv namespace create COURSE_CACHE` → paste the id into `wrangler.jsonc`
2. `wrangler secret put GOOGLE_MAPS_API_KEY`

Then GitHub Actions runs `wrangler deploy` on every push to `main` touching this
service.
