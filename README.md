# Your Golf Buddy

An offline-first golf companion: track rounds hole-by-hole, keep notes, review
club setup and practice drills, and sync your data across devices.

A **pnpm + Turborepo monorepo**. Everything is TypeScript; the two backend
services and the web app all deploy to **Cloudflare** from GitHub Actions.

## Layout

```
apps/
  web/          Next.js 15 PWA — the primary client (Cloudflare Workers via @opennextjs/cloudflare)
  mobile/       Expo / React Native — scaffold only, not started (not a workspace member)
services/
  profile-sync/ Hono + Workers + D1 — cursor-based cloud sync (rewritten from Laravel/PHP)
  course-ls/    Hono + Workers — nearby-course lookup (prototype, mock data)
packages/
  shared/       @ygb/shared — the sync wire contract (types + zod schemas), shared by web and profile-sync
docs/           Architecture, deployment, roadmap, working notes index
notes/          Dated dev journal
```

| App                          | Status | Deploys as        |
| ---------------------------- | ------ | ----------------- |
| [`apps/web`](./apps/web)     | ✅ in use | `ygb-web` |
| [`services/profile-sync`](./services/profile-sync) | ✅ working | `ygb-profile-sync` (+ D1) |
| [`services/course-ls`](./services/course-ls) | 🟡 prototype (mock data) | `ygb-course-ls` |
| [`apps/mobile`](./apps/mobile) | 🔴 scaffold only | — |

Each app has its own README with detail. AI agents: see [`AGENTS.md`](./AGENTS.md).

## How the pieces fit

```
        ┌──────────────┐   cursor sync   ┌──────────────────┐
        │  apps/web    │◀───────────────▶│ profile-sync     │
        │  IndexedDB   │  /api/sync/*    │ Hono · D1        │
        └──────┬───────┘                 └──────────────────┘
               │ shares types
               ▼
        ┌──────────────┐
        │ @ygb/shared  │  request/response contract (types + zod)
        └──────────────┘

  course-ls (nearby courses, not yet wired to any client)
  apps/mobile (placeholder)
```

- **web** stores everything locally (anonymous profile + rounds in IndexedDB)
  and works fully offline. When online and sync is enabled it does cursor-based
  push/pull against **profile-sync**. Identity is a local anonymous profile —
  no accounts, no third-party auth (see [`docs/identity.md`](./docs/identity.md)).
- **profile-sync** is single-user and unauthenticated. UUID ids, ISO-8601
  timestamps, soft deletes, `max(updated_at, deleted_at)` cursors per table.
- **course-ls** is a separate concern and not yet integrated.

## Develop

Requires Node 22 and pnpm 10 (`corepack enable` or install pnpm directly).

```bash
pnpm install

pnpm dev                       # turbo: runs every package's dev task
pnpm --filter web dev          # just the web app        (:3002)
pnpm --filter profile-sync dev # just the sync service   (:8787, wrangler dev)
pnpm --filter course-ls dev    # just course-ls          (:8787, wrangler dev)

pnpm turbo run typecheck lint test build   # what CI runs
```

To run web against a local sync service:

```bash
pnpm --filter profile-sync exec wrangler d1 migrations apply ygb-profile-sync --local
pnpm --filter profile-sync dev
# in another shell — endpoint is a build-time var:
NEXT_PUBLIC_SYNC_ENDPOINT=http://localhost:8787/api pnpm --filter web dev
```

`apps/mobile` is **not** in the pnpm workspace (React Native / Metro needs its
own hoisted `node_modules`). Work on it with `cd apps/mobile && npm install && npx expo start`.

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
| [`notes/`](./notes)                      | Dated working notes |

## Migration notes

This repo was assembled from three separate repos in Sept 2026:

- `apps/web` keeps its full history (imported via `git subtree`).
- `services/profile-sync` was **rewritten** from Laravel/PHP to TypeScript; the
  sync wire contract is unchanged, so the web client needed no sync-logic changes.
- `services/course-ls` was ported from Express to Hono; `apps/mobile` came in as-is.
- Clerk was already gone from all code; only the docs referenced it, and those
  were removed.
