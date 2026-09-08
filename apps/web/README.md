# Your Golf Buddy — Web App

The primary Your Golf Buddy client: an offline-first PWA for tracking golf rounds
hole-by-hole, keeping notes, and reviewing club/practice reference material. Data
lives locally in the browser (IndexedDB) and optionally syncs to the
[profile-sync](../../services/profile-sync) service.

**Status:** ✅ Functional. Local play and profile sync both work. This is the
app that is actually in use today.

## Tech stack

| Concern        | Choice                                            |
| -------------- | ------------------------------------------------- |
| Framework      | Next.js 15.5 (App Router, Turbopack) + React 19   |
| Language       | TypeScript 5                                      |
| Styling        | Tailwind CSS v4                                    |
| Local storage  | IndexedDB via Dexie (`lib/db.ts`) and `idb` (`lib/profile-db.ts`) |
| Data fetching  | TanStack Query, TanStack Virtual                  |
| PWA            | `public/manifest.json` + hand-rolled `public/sw.js`, registered in `app/layout.tsx` |
| Hosting        | Cloudflare Workers via `@opennextjs/cloudflare` (`ygb-web`) |

## Getting started

From the repo root (`pnpm install` once):

```bash
pnpm --filter web dev          # http://localhost:3002 (next dev, Turbopack)
```

| Script                     | What it does                                              |
| -------------------------- | ------------------------------------------------------- |
| `pnpm --filter web dev`    | Next dev server on port 3002                              |
| `pnpm --filter web build`  | `next build` (used by CI and by the Cloudflare build)    |
| `pnpm --filter web preview`| `opennextjs-cloudflare build` then serve on the Workers runtime locally (`wrangler dev`) — use this to verify PWA / service-worker behaviour |
| `pnpm --filter web deploy` | `opennextjs-cloudflare build` then `deploy` to Cloudflare |
| `pnpm --filter web lint`   | ESLint (`eslint-config-next`)                             |
| `pnpm --filter web typecheck` | `tsc --noEmit`                                        |
| `pnpm --filter web seed`   | `tsx lib/seed.ts` — load `lib/seed-data.json` (browser context) |

## Configuration

`NEXT_PUBLIC_SYNC_ENDPOINT` and `NEXT_PUBLIC_COURSE_LS_ENDPOINT` are **inlined at
build time** (`next build`), not read at runtime.

Locally they come from `apps/web/.env.local`, which is **generated** — edit the
repo-root `.env` (see `../../.env.example`) and run `pnpm env:sync`. In CI the
deploy workflow sets them from repo variables before building.

## How it works

### Identity — anonymous profiles

There is **no account system and no third-party auth**. On first visit the user
registers a lightweight profile (username + date of birth, DOB stored only as a
hash) in a dedicated IndexedDB database (`GolfBuddyProfiles`, `lib/profile-db.ts`).
The profile id and username are mirrored into `localStorage`
(`golf_buddy_profile_id`, `golf_buddy_username`). `app/page.tsx` redirects to
`/games` when a profile exists, otherwise to profile registration. See
[`docs/identity.md`](../../docs/identity.md).

### Round data — Dexie / IndexedDB

`lib/db.ts` defines the `ScoreCardNotes` database (schema v8+) with three stores,
all scoped by `profileId`:

- **courses** — `{ name, rounds: 9 | 18, profileId }`
- **games** — `{ date, courseId, finalNote, finalScore }`
- **scores** — `{ gameId, hole, par, score, putts }` (per-hole entries; the
  field was renamed from `rating` to `putts`)

### Course typeahead

The new-course form (`components/NewCourseForm.tsx`) offers autocomplete
suggestions from the [`course-ls`](../../services/course-ls) service:
`lib/use-course-search.ts` debounces keystrokes (300 ms), cancels in-flight
requests, and biases by the user's location when geolocation is granted.
`lib/course-search.ts` never throws — if `NEXT_PUBLIC_COURSE_LS_ENDPOINT` is
unset or the service errors, the field is plain free text.

### Cloud sync

`lib/cloud-sync.ts` implements cursor-based sync against the profile-sync service
(`/sync/state`, `/sync/push`, `/sync/pull`), tracking per-table cursors and a
device id in `localStorage`. Wire-contract types come from
[`@ygb/shared`](../../packages/shared). `lib/sync-manager.ts` decides *when* to
sync — on app startup, when the connection returns, and after a game is
completed. `SyncManagerInitializer` and `SyncNotification` (in the root layout)
wire it into the UI; users toggle and inspect sync from **Settings**.

## Routes

| Route                    | Purpose                                                    |
| ------------------------ | --------------------------------------------------------- |
| `/`                      | Profile gate — redirects to `/games` or `/profile-registration` |
| `/profile-registration`  | Create the anonymous profile                               |
| `/games`                 | List past rounds; add a course; start a new round          |
| `/game?courseId=…`       | Hole-by-hole scorecard entry for a round                   |
| `/swing-tips`            | Club setup reference from `lib/swing-tips.json`            |
| `/practice-drills`      | Per-club practice drills from `lib/practice-drills.json`   |
| `/settings`             | Sync settings + app info                                   |

There are no server routes — every page is a client component over IndexedDB.
(The former `/api/games` handler and `/api-docs` page were dead code and were
removed in the monorepo migration.)

## Project layout

```
app/            Next.js App Router pages (all client components)
components/      UI components
  ImprovementTemplate/   Shared layout pieces for swing-tips / practice-drills
lib/
  db.ts                  Dexie schema (courses, games, scores)
  profile-db.ts          idb wrapper for anonymous profiles
  cloud-sync.ts          Cursor-based sync client (types from @ygb/shared)
  sync-manager.ts        Sync trigger orchestration
  seed.ts / seed-data.json     Dev data seeding
  swing-tips.json / practice-drills.json   Reference content
public/         manifest.json, sw.js, _headers, icons
next.config.ts  Minimal; wires initOpenNextCloudflareForDev() for `next dev`
open-next.config.ts / wrangler.jsonc   Cloudflare Workers adapter config
```

`certificates/` and `.vercel/` (both gitignored) are leftover local dev files
and are not used by the Cloudflare workflow.

## Known issues

Tracked in [`../../docs/bugs.md`](../../docs/bugs.md):

- Mobile: orange button component needs a fix
- PWA: odd delete + home-list behavior
- Multi-device sync has id-collision edge cases (`docs/bugs.md`)
