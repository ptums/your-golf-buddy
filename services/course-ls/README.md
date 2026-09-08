# Your Golf Buddy — Course Location Service (Course LS)

A small Node/Express + TypeScript API that returns nearby golf courses for a
GPS location, with location-bucketed caching so responses are fast and payloads
are tiny. Intended as the "connect, deliver, disconnect" data source for the
offline clients.

**Status:** 🟡 Prototype / scaffold. The HTTP layer, caching, and distance math
work, but `CourseService.fetchFromExternalAPI()` currently returns **mock data** —
no real course-data provider is wired up, and no persistent cache is used yet.
Not deployed. Not a git repo of its own.

See `../docs/prompts.md` for the original design rationale (why Go was considered;
the implementation landed on Node/TS instead).

## Tech stack

| Concern      | Choice                                             |
| ------------ | ------------------------------------------------- |
| Runtime      | Node.js + TypeScript 5                            |
| HTTP         | Express 5, `cors`                                 |
| HTTP client  | `axios` (for the future external API call)        |
| Cache        | In-memory `Map` with per-entry TTL (`CacheService`). `ioredis` / `redis` are installed for a future Redis backend but **not used**. |
| Dev runner   | `nodemon` + `ts-node`                             |

## Getting started

```bash
npm install
cp env.example .env
npm run dev          # ts-node + nodemon on http://localhost:3000
```

| Script            | What it does                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Watch `src/` and run with ts-node    |
| `npm run build`   | `tsc` → `dist/`                      |
| `npm start`       | Run compiled `dist/index.js`         |

## Configuration

From `env.example`:

```bash
PORT=3000
EXTERNAL_API_URL=https://api.example.com/courses   # not yet consumed
EXTERNAL_API_KEY=your_api_key_here                 # not yet consumed
REDIS_URL=redis://localhost:6379                   # not yet consumed
REDIS_PASSWORD=
CACHE_TTL=3600                                     # CacheService uses a hard-coded 3600s
```

## API

### `GET /health`

```json
{ "status": "healthy", "timestamp": "2025-01-15T10:30:00.000Z", "service": "course-location-service" }
```

### `GET /courses`

| Query param | Required | Default | Notes                     |
| ----------- | -------- | ------- | ------------------------- |
| `lat`       | yes      | —       | -90..90, validated        |
| `lng`       | yes      | —       | -180..180, validated      |
| `radius`    | no       | `10`    | miles                     |
| `limit`     | no       | `20`    | max courses returned      |

```
GET /courses?lat=40.7128&lng=-74.0060&radius=15&limit=10
```

```json
{
  "courses": [
    { "id": "1", "name": "Pebble Beach Golf Links", "holes": 18, "par": 72, "yardage": 6828, "distance": 2.3 }
  ],
  "cached": false,
  "timestamp": 1705312200000
}
```

Distances use the Haversine formula and results are sorted nearest-first.

## How it works

```
Client ──▶ GET /courses ──▶ CourseService
                               │  1. CacheService.getCachedCourses(lat,lng,radius)
                               │     key = round(lat,3)_round(lng,3)_radius  (~100 m buckets)
                               │  2. on miss: fetchFromExternalAPI()  ← MOCK today
                               │  3. convert to CourseSummary + compute distance
                               │  4. CacheService.setCachedCourses(...)  TTL 1 h
                               └──▶ { courses, cached, timestamp }
```

## Project layout

```
src/
  index.ts                  Express app, routes, validation
  types.ts                  Course, CourseSummary, request/response types
  services/
    CourseService.ts        Orchestration + mock external fetch + Haversine
    CacheService.ts         In-memory location-bucketed cache with TTL
```

## To make this production-ready

1. Replace `CourseService.fetchFromExternalAPI()` with a real provider, wired to
   `EXTERNAL_API_URL` / `EXTERNAL_API_KEY`.
2. Swap `CacheService`'s `Map` for Redis (deps already installed) so the cache
   survives restarts and can run near the user.
3. Add rate limiting, structured logging, and auth if the endpoint is public.
4. Add a deployment target (Railway / Render / Fly / a small VPS) and a git repo.
