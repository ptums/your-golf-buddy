# Your Golf Buddy

An offline-first golf companion: track rounds hole-by-hole, keep notes, review
club setup and practice drills, and sync your data across devices.

A **pnpm + Turborepo monorepo**. Everything is TypeScript; the two backend
services and the web app deploy to **Cloudflare** from GitHub Actions, and the
mobile app wraps the web app in a native shell. All four are functional.

## Layout

```
apps/
  web/          Next.js 15 PWA — the primary client (Cloudflare Workers via @opennextjs/cloudflare)
  mobile/       Expo / React Native — a WebView shell around the web app (not a workspace member)
services/
  profile-sync/ Hono + Workers + D1 — cursor-based cloud sync (rewritten from Laravel/PHP)
  course-ls/    Hono + Workers — golf-course typeahead (Google Places + a two-tier edge cache)
packages/
  shared/       @ygb/shared — wire contracts (types + zod), shared by web and both services
docs/           Architecture, deployment, roadmap
```

| App | Status | Where |
| --- | ------ | ----- |
| [`apps/web`](./apps/web)                          | ✅ Live | https://ygb-web.peter-686.workers.dev |
| [`services/profile-sync`](./services/profile-sync) | ✅ Live | `ygb-profile-sync` Worker + D1 |
| [`services/course-ls`](./services/course-ls)       | ✅ Live | `ygb-course-ls` Worker + KV |
| [`apps/mobile`](./apps/mobile)                     | ✅ Builds | Expo — ship with EAS Build |

Each app has its own README with detail. AI agents: see [`AGENTS.md`](./AGENTS.md).

## How the pieces fit

```
                          course suggestions        ┌──────────────┐
        ┌──────────────┐  /courses/search   ───────▶│  course-ls   │──▶ Google Places
        │  apps/web    │────────────────────────────│  Hono · KV   │
        │  Next.js PWA │                            └──────────────┘
        │  IndexedDB   │       cursor sync           ┌──────────────────┐
        │              │◀──────────────────────────▶ │  profile-sync    │──▶ D1 (SQLite)
        └──────┬───────┘       /sync/*               │  Hono · Drizzle  │
               │                                     └──────────────────┘
               │ both sides share ▼
        ┌──────────────┐
        │  @ygb/shared │  request/response contracts (types + zod)
        └──────────────┘

  apps/mobile ── native shell: a full-screen WebView on the deployed web app
```

- **web** stores everything locally (anonymous profile + rounds in IndexedDB)
  and works fully offline. Cloud sync is opt-in (Settings) and does cursor-based
  push/pull against **profile-sync**. Identity is a local anonymous profile —
  no accounts, no third-party auth (see [`docs/identity.md`](./docs/identity.md)).
- **profile-sync** authenticates each request with the profile's UUID as a
  bearer token (a capability, not a login) and scopes every read/write to it,
  with a coarse rate limiter. UUID ids, ISO-8601 timestamps, soft deletes,
  `max(updated_at, deleted_at)` cursors per table, and a `/sync/delete` endpoint.
- **course-ls** backs the new-round course typeahead: it wraps Google Places
  Text Search and serves repeat queries from a Cache API → Workers KV → Google
  chain so keystrokes stay fast and cheap.
- **mobile** is a `react-native-webview` pointed at the deployed web app, plus
  the native niceties (icon, splash, hardware-back, geolocation prompt).

## Run it locally

Requires Node 22 and pnpm 10 (`corepack enable`, or install pnpm directly).

```bash
pnpm install

# one-time config
cp .env.example .env      # for local dev you only need GOOGLE_MAPS_API_KEY (optional)
                          # and the two NEXT_PUBLIC_* URLs at their localhost defaults.
                          # CLOUDFLARE_* are only needed to deploy.
pnpm env:sync             # writes apps/web/.env.local + services/course-ls/.dev.vars

# one-time: create the local D1 schema
pnpm --filter profile-sync exec wrangler d1 migrations apply ygb-profile-sync --local

# run everything
pnpm dev
```

`pnpm dev` starts all three: **web on http://localhost:3002**, profile-sync on
`:8787`, course-ls on `:8788`. Open the web URL.

- The web app is **offline-first** — it works with nothing else running; data
  lives in your browser's IndexedDB. Cloud sync is opt-in under **Settings**;
  when enabled it talks to the local profile-sync.
- The **course typeahead** needs `GOOGLE_MAPS_API_KEY` in `.env`
  (`pnpm env:sync` again after editing). Without it the course field is plain text.
- Just the web app: `pnpm --filter web dev`. Just one service:
  `pnpm --filter profile-sync dev` / `pnpm --filter course-ls dev`.

```bash
pnpm turbo run typecheck lint test build   # what CI runs
```

`apps/mobile` is **not** in the pnpm workspace (React Native / Metro needs its
own hoisted `node_modules`). It's a thin native shell — one full-screen WebView
on the deployed web app. Work on it with
`cd apps/mobile && npm install && npx expo start`; ship it with EAS Build (see
its README).

## Deploy

Push to `main` → `.github/workflows/deploy.yml` deploys whatever changed to
Cloudflare. First-time Cloudflare account / D1 / secrets setup is in
[`docs/deploy.md`](./docs/deploy.md).

## Documentation

| Path | Contents |
| ---- | -------- |
| [`docs/deploy.md`](./docs/deploy.md)     | Cloudflare setup, secrets, how the workflows work |
| [`docs/identity.md`](./docs/identity.md) | The anonymous-profile model (current); replaces the dropped Clerk/JWT docs |
| [`docs/roadmap.md`](./docs/roadmap.md)   | Phased solo-dev plan |
| [`docs/features.md`](./docs/features.md) | Feature ideas |
| [`docs/bugs.md`](./docs/bugs.md)         | Known bugs |
| [`docs/setup.md`](./docs/setup.md)       | Pre-launch checklist (repo hardening, legal, IP) |
| [`docs/prompts.md`](./docs/prompts.md)   | Design notes |

## Migration notes

This repo was assembled from three separate repos in Sept 2026:

- `apps/web` keeps its full history (imported via `git subtree`).
- `services/profile-sync` was **rewritten** from Laravel/PHP to TypeScript; the
  sync wire contract is unchanged, so the web client needed no sync-logic changes.
- `services/course-ls` was ported from Express to Hono; `apps/mobile` went from a
  create-expo-app scaffold to a WebView wrapper.
- Clerk was already gone from all code; only the docs referenced it, and those
  were removed.
