# Your Golf Buddy — Profile Sync Service

Cursor-based data synchronization between the [web app](../../apps/web) and the
cloud. Single user, multiple devices: conflict-free incremental sync using
high-water-mark cursors and soft deletes.

> **Rewritten from Laravel/PHP to TypeScript.** Same stack as the rest of the
> monorepo. Runs on Cloudflare Workers with a D1 (SQLite) database. The wire
> contract is unchanged — the web client needed no sync-logic changes.

## Stack

| Concern     | Choice                                        |
| ----------- | ------------------------------------------- |
| Runtime     | Cloudflare Workers                          |
| Router      | Hono 4                                      |
| Database    | Cloudflare D1 (SQLite)                      |
| ORM         | Drizzle ORM + drizzle-kit (migration gen)  |
| Validation  | Zod, via `@hono/zod-validator` and `@ygb/shared` schemas |
| Tests       | Vitest + `@cloudflare/vitest-pool-workers` (real Workers runtime + D1) |

## Develop

From the repo root (`pnpm install` once), or from this directory:

```bash
pnpm --filter profile-sync dev            # wrangler dev on http://localhost:8787
pnpm --filter profile-sync test           # vitest (Workers pool)
pnpm --filter profile-sync typecheck
pnpm --filter profile-sync db:migrate:local
```

First run locally:

```bash
pnpm --filter profile-sync exec wrangler d1 migrations apply ygb-profile-sync --local
pnpm --filter profile-sync dev
curl -XPOST localhost:8787/api/sync/push -H 'content-type: application/json' -d @../../docs/sync-sample.json
```

## Data model

Ported 1:1 from the previous Laravel migrations. Every domain table has
`id` (UUID, app-generated), `created_at`, `updated_at` (the cursor),
`deleted_at` (nullable tombstone). Timestamps are ISO-8601 strings.

| table      | columns                                                       |
| ---------- | ------------------------------------------------------------ |
| `profiles` | `username` (unique), `dob_hash`                              |
| `courses`  | `profile_id`, `external_id`, `name`, `rounds`; unique `(profile_id, external_id)` |
| `games`    | `profile_id`, `external_id`, `course_id`, `date`, `final_note?`, `final_score?` |
| `scores`   | `profile_id`, `external_id`, `game_id`, `hole`, `par`, `score`, `putts` |

Schema lives in `src/db/schema.ts`. Regenerate migration SQL after a schema
change with `pnpm --filter profile-sync db:generate`.

### External IDs

The web client posts raw IndexedDB rows with numeric local ids. The server
derives a stable `external_id` — `course:7`, `game:42`, `score:9001` — and
resolves profile ownership for games/scores through course → profile. This
matches the previous Laravel legacy `sync()` behaviour, which is the path the
live client actually exercises.

## API

Base path `/api`. Routes in `src/index.ts`; logic in `src/sync/*`.

| Method & path          | Purpose                                                      |
| ---------------------- | --------------------------------------------------------- |
| `GET  /api/v1/health`    | `{ "ok": true }`                                           |
| `POST /api/sync/state`   | Compare client cursors to server. `{ inSync }`, or `{ inSync:false, serverCursors, counts }`. |
| `POST /api/sync/push`    | Idempotent upsert of `profiles`/`courses`/`games`/`scores`. Returns `{ status:"ok", saved, serverCursors }`. |
| `POST /api/v1/sync`      | Legacy alias for `/api/sync/push`.                          |
| `POST /api/sync/pull`    | Rows changed since the client's cursors (`limit` 1–1000, default 100). Returns `{ changes, serverCursors }`. |

**Cursors**: `max(updated_at, deleted_at)` per table, ISO-8601. `pull` returns
rows where `updated_at > cursor` OR `deleted_at > cursor`, ordered by `updated_at`.

**Conflict resolution**: last-write-wins on `updated_at`; an upsert clears
`deleted_at`.

**Auth**: none (single-user assumption). Do not expose publicly as-is. CORS
origins are set by the `CORS_ORIGINS` var in `wrangler.jsonc` (`*` by default).

## Deploy

See [`docs/deploy.md`](../../docs/deploy.md). One-time: `wrangler d1 create
ygb-profile-sync`, paste the `database_id` into `wrangler.jsonc`. Thereafter
GitHub Actions runs `wrangler d1 migrations apply --remote` then
`wrangler deploy` on every push to `main` that touches this service.

## Known limitations (carried from the previous version, not regressions)

- The web client's `applyChanges` writes server rows (UUID `id`) straight into
  Dexie's numeric keyspace. Tracked in `docs/bugs.md`.
- Writes in a push are sequential, not one atomic batch. Payloads are tiny and
  the client only advances its cursor on full success, so a partial failure is
  simply retried.
