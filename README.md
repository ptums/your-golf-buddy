# Your Golf Buddy

An offline-first golf companion: track rounds hole-by-hole, keep notes, review
club setup and practice drills, and sync your data across devices.

This directory is a workspace holding several independently-versioned apps plus
shared design docs. It is **not** itself a git repository — each app has (or will
have) its own repo.

## Apps

| App                          | What it is                                   | Stack                       | Status | Repo |
| ---------------------------- | ------------------------------------------- | --------------------------- | ------ | ---- |
| [`web/`](./web)              | Primary client — offline-first PWA for score tracking, notes, and reference content | Next.js 15 · React 19 · TypeScript · Dexie/IndexedDB · Tailwind v4 | ✅ **Functional** — in use today | [ptums/score-card-and-notes](https://github.com/ptums/score-card-and-notes) |
| [`profile-sync/`](./profile-sync) | Cursor-based sync service the web app pushes/pulls to | Laravel 12 · PHP 8.2 · SQLite | ✅ **Functional** — web client syncs against it | [ptums/ygb-profile-sync](https://github.com/ptums/ygb-profile-sync) |
| [`course-ls/`](./course-ls) | Course Location Service — nearby-course lookup API with location caching | Node · Express 5 · TypeScript | 🟡 **Prototype** — HTTP + cache work, course data is still mocked | — (no repo) |
| [`mobile/`](./mobile)       | Native client, intended to mirror the web app | Expo SDK 54 · React Native 0.81 | 🔴 **Scaffold only** — still the create-expo-app template | local git, no remote |

Each app has its own README with setup and architecture details.

## How the pieces fit

```
                 ┌──────────────┐         ┌──────────────────┐
                 │   web (PWA)  │◀───────▶│   profile-sync   │
                 │  IndexedDB   │  sync   │  Laravel/SQLite  │
                 └──────┬───────┘ /sync/* └──────────────────┘
                        │
                        │ (planned) nearby courses
                        ▼
                 ┌──────────────┐
                 │  course-ls   │  (mock data today)
                 └──────────────┘

   ┌──────────────┐
   │   mobile     │  (not yet built; will reuse web logic + profile-sync)
   └──────────────┘
```

- **web** stores everything locally (anonymous profile + rounds in IndexedDB) and
  works fully offline. When online and sync is enabled, it does cursor-based
  push/pull against **profile-sync**.
- **profile-sync** is a single-user, no-auth sync backend using UUIDs, soft
  deletes, and `max(updated_at, deleted_at)` cursors per table
  (profiles, courses, games, scores).
- **course-ls** is a separate concern — fast nearby-course lookups by GPS — and
  is not yet integrated into any client.
- **mobile** is a placeholder.

## Local development quick reference

```bash
# Web (http://localhost:3002)
cd web && npm install && npm run dev

# Profile Sync (http://localhost:8000)
cd profile-sync && composer install && cp .env.example .env \
  && php artisan key:generate && php artisan migrate && php artisan serve

# Course LS (http://localhost:3000)
cd course-ls && npm install && cp env.example .env && npm run dev

# Mobile
cd mobile && npm install && npx expo start
```

To run web against a local sync service, set `NEXT_PUBLIC_SYNC_ENDPOINT` in
`web/.env.local` (default is `http://localhost:8000/api`).

## Documentation

| Path | Contents |
| ---- | -------- |
| [`docs/roadmap.md`](./docs/roadmap.md) | Phased solo-dev plan: MVP polish → closed beta → launch |
| [`docs/features.md`](./docs/features.md) | Upcoming feature ideas (FE/BE/mobile) |
| [`docs/bugs.md`](./docs/bugs.md) | Known bugs |
| [`docs/authentication.md`](./docs/authentication.md) | History of the local-auth experiment (superseded by anonymous profiles) |
| [`docs/hybrid-auth.md`](./docs/hybrid-auth.md) | History of the Clerk + offline hybrid-auth experiment (also dropped) |
| [`docs/setup.md`](./docs/setup.md) | Pre-launch checklist: repo hardening, secrets, legal, IP |
| [`docs/prompts.md`](./docs/prompts.md) | Design notes, incl. the Course LS language decision |
| [`notes/`](./notes) | Dated working notes / dev journal |

> Note: `docs/authentication.md` and `docs/hybrid-auth.md` describe approaches
> that were **abandoned**. The current design uses a local anonymous profile
> (username + hashed DOB) and no third-party auth — see `web/README.md`.

## Roadmap snapshot

Currently in **Phase 1 — MVP polish** (`docs/roadmap.md`): stabilize the web app
and profile sync, fix offline-flow bugs, keep the feature set focused on score
tracking, club knowledge, and practice drills. `course-ls` and `mobile` are
later-phase work.
