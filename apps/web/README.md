# Your Golf Buddy — Web App

> Package name: `score-card-and-notes` · Repo: [ptums/score-card-and-notes](https://github.com/ptums/score-card-and-notes)

The primary Your Golf Buddy client: an offline-first PWA for tracking golf rounds
hole-by-hole, keeping notes, and reviewing club/practice reference material. Data
lives locally in the browser (IndexedDB) and optionally syncs to the
[Profile Sync](../profile-sync) service.

**Status:** ✅ Functional. Local play and profile sync both work. This is the
app that is actually in use today.

## Tech stack

| Concern        | Choice                                            |
| -------------- | ------------------------------------------------- |
| Framework      | Next.js 15.3 (App Router, Turbopack) + React 19   |
| Language       | TypeScript 5                                      |
| Styling        | Tailwind CSS v4                                    |
| Local storage  | IndexedDB via Dexie (`lib/db.ts`) and `idb` (`lib/profile-db.ts`) |
| Data fetching  | TanStack Query, TanStack Virtual                  |
| PWA            | `public/manifest.json` + hand-rolled `public/sw.js`, registered in `app/layout.tsx` |
| Telemetry      | `@vercel/speed-insights`                          |
| Hosting        | Vercel (project `your-golf-buddy`)                |

## Getting started

```bash
npm install
npm run dev          # http://localhost:3002 (Turbopack)
```

Other scripts:

| Script                | What it does                                        |
| --------------------- | -------------------------------------------------- |
| `npm run dev`         | Dev server on port 3002                             |
| `npm run https-dev`   | Dev server with experimental HTTPS on port 3003 (needed to test PWA/service-worker features) |
| `npm run clean-dev`   | Wipe `.next` then run `https-dev`                   |
| `npm run build`       | Production build                                    |
| `npm start`           | Serve production build on port 3004                 |
| `npm run prod`        | Build + serve on port 3005                          |
| `npm run lint`        | ESLint (`eslint-config-next`)                       |
| `npm run seed`        | `ts-node lib/seed.ts` — load `lib/seed-data.json` into IndexedDB (browser context) |

## Configuration

Copy `env.example` to `.env.local`:

```bash
# Base URL of the Profile Sync service. cloud-sync.ts appends /sync/*.
# Falls back to http://localhost:8000/api when unset.
NEXT_PUBLIC_SYNC_ENDPOINT=https://your-sync-endpoint.example.com/api
```

`certificates/` holds local dev certs for `https-dev`.

## How it works

### Identity — anonymous profiles

There is **no account system and no Clerk** (earlier auth experiments were
dropped — see `../docs/authentication.md` and `../docs/hybrid-auth.md` for the
history). On first visit the user registers a lightweight profile
(username + date of birth, DOB stored only as a hash) in a dedicated IndexedDB
database (`GolfBuddyProfiles`, `lib/profile-db.ts`). The profile id and username
are mirrored into `localStorage` (`golf_buddy_profile_id`, `golf_buddy_username`)
for quick access. `app/page.tsx` redirects to `/games` when a profile exists,
otherwise to profile registration.

### Round data — Dexie / IndexedDB

`lib/db.ts` defines the `ScoreCardNotes` database (currently schema v8+) with
three stores, all scoped by `profileId`:

- **courses** — `{ name, rounds: 9 | 18, profileId }`
- **games** — `{ date, courseId, finalNote, finalScore }`
- **scores** — `{ gameId, hole, par, score, putts }` (per-hole entries; the
  field was renamed from `rating` to `putts`)

### Cloud sync

`lib/cloud-sync.ts` implements cursor-based sync against the Profile Sync
service (`/sync/state`, `/sync/push`, `/sync/pull`), tracking per-table cursors
and a device id in `localStorage`. `lib/sync-manager.ts` decides *when* to sync —
on app startup, when the connection comes back online, and after a game is
completed. `SyncManagerInitializer` and `SyncNotification` (mounted in the root
layout) wire this into the UI; users toggle and inspect sync from **Settings**.

Default sync interval is 24h; the endpoint comes from `NEXT_PUBLIC_SYNC_ENDPOINT`.

## Routes

| Route                    | Purpose                                                    |
| ------------------------ | --------------------------------------------------------- |
| `/`                      | Profile gate — redirects to `/games` or `/profile-registration` |
| `/profile-registration`  | Create the anonymous profile                               |
| `/games`                 | List past rounds; add a course; start a new round          |
| `/game?courseId=…`       | Hole-by-hole scorecard entry for a round                   |
| `/swing-tips`            | Club setup reference (ball position, stance, lie adjustments) from `lib/swing-tips.json` |
| `/practice-drills`      | Per-club practice drills from `lib/practice-drills.json`   |
| `/settings`             | Sync settings + app info                                   |
| `/api-docs`             | Human-readable API documentation page                      |
| `/api/games`            | Route handler over the local Dexie DB (`?action=count\|all\|with-courses\|by-id\|by-user\|recent\|stats`, plus `POST` create/update/delete). Note: only usable where `lib/db.ts` resolves, i.e. not a true server API. |

## Project layout

```
app/            Next.js App Router pages + /api/games route handler
components/      UI components
  ImprovementTemplate/   Shared layout pieces for swing-tips / practice-drills
lib/
  db.ts                  Dexie schema (courses, games, scores)
  profile-db.ts          idb wrapper for anonymous profiles
  cloud-sync.ts          Cursor-based sync client
  sync-manager.ts        Sync trigger orchestration
  seed.ts / seed-data.json     Dev data seeding
  swing-tips.json / practice-drills.json   Reference content
public/         manifest.json, sw.js, icons
certificates/   Local HTTPS dev certs
```

## Known issues

Tracked in `../docs/bugs.md`:

- Mobile: orange button component needs a fix
- PWA: odd delete + home-list behavior
- Sync alert bug (`../notes/09-08-2025.md`)
