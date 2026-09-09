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
# the profile id in sync-sample.json (11111111-…) is the bearer token:
curl -XPOST localhost:8787/api/sync/push \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer 11111111-1111-1111-1111-111111111111' \
  -d @../../docs/sync-sample.json
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

## Auth

Every `/sync/*` request must send `Authorization: Bearer <profileId>`, where
`<profileId>` is the client's profile UUID. That UUID is a **capability token**:
122 bits of entropy, unguessable, so knowing it is the only way to reach that
profile's rows. Requests without a well-formed UUID get `401`; the token is also
run through a coarse rate limiter (120 req/min, `SYNC_LIMITER` binding — no
setup, `namespace_id` is just an identifier). See `src/auth.ts`.

Every read and write is scoped to the token's profile (`src/sync/*`), so one
token never sees another profile's data.

**Golf Buddy Pass** (dark): when `PASS_ENFORCED` is `"true"`, `/sync/*` also
requires a valid `X-Golf-Pass` header — an HMAC-signed token issued by
`POST /pass/claim` after a Stripe purchase (`src/pass.ts`, `src/pass/claim.ts`).
Off by default; sync is free. Full launch steps in [`docs/pass.md`](../../docs/pass.md).

## API

Base path `/api`, also served at the root. Routes in `src/index.ts`.

| Method & path        | Purpose                                                      |
| -------------------- | --------------------------------------------------------- |
| `GET  /api/v1/health`  | `{ "ok": true }` — no auth                                 |
| `POST /api/sync/state` | Compare client cursors to server. `{ inSync }`, or `{ inSync:false, serverCursors, counts }` — all per-profile. |
| `POST /api/sync/push`  | Idempotent upsert of the caller's `profiles`/`courses`/`games`/`scores`. `{ status:"ok", saved, serverCursors }`. |
| `POST /api/v1/sync`    | Legacy alias for `/api/sync/push`.                          |
| `POST /api/sync/pull`  | Rows changed since the client's cursors (`limit` 1–1000, default 100). `{ changes, serverCursors }`. Games carry `course_external_id`, scores carry `game_external_id`. |
| `POST /api/sync/delete`| Hard-delete every server row for the caller's profile. `{ status:"ok", deleted }`. |
| `POST /api/log`        | Client-error sink → Analytics Engine (`TELEMETRY` binding). No auth; IP rate-limited (30/min, `LOG_LIMITER`). Body `{ message, stack?, url?, level? }`. Always `204`. Used by the web app's global error handler (`apps/web/lib/error-logger.ts`). |
| `POST /api/pass/claim` | Stripe Checkout session → Golf Buddy Pass. No auth; IP rate-limited. Body `{ sessionId }`. `404` unless `PASS_ENABLED` + the `STRIPE_SECRET_KEY` / `PASS_SECRET` secrets are set. See [`docs/pass.md`](../../docs/pass.md). |

**Cursors**: `max(updated_at, deleted_at)` per table, ISO-8601. `pull` returns
rows where `updated_at > cursor` OR `deleted_at > cursor`, ordered by `updated_at`.

**Conflict resolution**: last-write-wins on `updated_at`; an upsert clears
`deleted_at`.

**CORS**: origins from the `CORS_ORIGINS` var in `wrangler.jsonc` (`*` by
default — tighten to the web origin for production).

## Nightly backup

A cron trigger (`17 3 * * *`, `wrangler.jsonc` → `triggers.crons`) runs
`scheduled()` in `src/index.ts`, which calls `runBackup()` (`src/backup.ts`):
dumps all four tables to the `ygb-backups` R2 bucket as one JSON object at
`d1/<date>/<timestamp>.json`, then deletes dumps older than 30 days. Needs
Workers Paid for the cron; create the bucket with `pnpm cf:r2:create`. Restore
steps are in `docs/deploy.md`.

## Deploy

See [`docs/deploy.md`](../../docs/deploy.md). One-time: `wrangler d1 create
ygb-profile-sync`, paste the `database_id` into `wrangler.jsonc`;
`pnpm cf:r2:create` for the backups bucket. Thereafter GitHub Actions runs
`wrangler d1 migrations apply --remote`, `wrangler deploy`, then a post-deploy
`/v1/health` check on every push to `main` that touches this service.

## Known limitations (carried from the previous version, not regressions)

- The web client's `applyChanges` writes server rows (UUID `id`) straight into
  Dexie's numeric keyspace. Tracked in `docs/bugs.md`.
- Writes in a push are sequential, not one atomic batch. Payloads are tiny and
  the client only advances its cursor on full success, so a partial failure is
  simply retried.
