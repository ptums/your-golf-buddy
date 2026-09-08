# Your Golf Buddy — Course Location Service (Course LS)

A small Hono API on Cloudflare Workers that returns nearby golf courses for a
GPS location, with location-bucketed caching so responses are fast and payloads
tiny. Intended as the "connect, deliver, disconnect" data source for the offline
clients.

**Status:** 🟡 Prototype. The HTTP layer, cache, and distance math work, but
`CourseService.fetchFromExternalAPI()` returns **mock data** — no real
course-data provider is wired up. Not integrated with any client yet.

> Ported from Express to Hono/Workers during the monorepo migration. The
> `CourseService` / `CacheService` classes are unchanged; only the HTTP entry
> point and packaging changed.

## Stack

| Concern | Choice                                  |
| ------- | ------------------------------------- |
| Runtime | Cloudflare Workers                    |
| Router  | Hono 4                               |
| Cache   | In-memory `Map` with per-entry TTL (`CacheService`) |

## Develop

```bash
pnpm --filter course-ls dev        # wrangler dev on http://localhost:8787
pnpm --filter course-ls typecheck
```

```bash
curl "http://localhost:8787/health"
curl "http://localhost:8787/courses?lat=40.7128&lng=-74.0060&radius=15&limit=5"
```

## API

### `GET /health`

```json
{ "status": "healthy", "timestamp": "...", "service": "course-location-service" }
```

### `GET /courses`

| Query param | Required | Default | Notes                |
| ----------- | -------- | ------- | ------------------- |
| `lat`       | yes      | —       | -90..90             |
| `lng`       | yes      | —       | -180..180           |
| `radius`    | no       | `10`    | miles               |
| `limit`     | no       | `20`    | max courses         |

Returns `{ courses: CourseSummary[], cached: boolean, timestamp: number }`,
nearest-first (Haversine distance).

## Deploy

`wrangler deploy` (run by GitHub Actions on push to `main` touching this
service). See [`docs/deploy.md`](../../docs/deploy.md).

## To make this production-ready

1. Replace `CourseService.fetchFromExternalAPI()` with a real provider (env
   binding for the API key/URL, native `fetch`).
2. **Caching:** Workers isolates are ephemeral, so the current in-memory `Map`
   cache does not persist between requests. Move it to Workers KV or the Cache
   API keyed by the rounded lat/lng bucket.
3. Add rate limiting and structured logging if the endpoint is public.
