# AGENTS.md

Guidance for AI coding agents working in this repo. Humans: see `README.md`.

## What this is

Your Golf Buddy — an offline-first golf score tracker. A **pnpm + Turborepo
monorepo**, all TypeScript, everything deploys to **Cloudflare**.

```
apps/web/              Next.js 15 PWA (the product). Cloudflare Workers via @opennextjs/cloudflare.
apps/mobile/           Expo scaffold — NOT started, NOT a pnpm workspace member. Ignore unless asked.
services/profile-sync/ Hono + Workers + D1 + Drizzle. Cursor-based cloud sync.
services/course-ls/    Hono + Workers. Golf-course typeahead wrapping Google Places + a 2-tier cache.
packages/shared/       @ygb/shared — wire contracts (types + zod). Imported by web + both services.
docs/  notes/          Architecture/deploy docs; dated dev journal.
```

## Commands

```bash
pnpm install
pnpm turbo run typecheck lint test build     # everything CI runs — run before you finish
pnpm --filter web dev                        # :3002
pnpm --filter profile-sync dev               # :8787  (wrangler dev)
pnpm --filter course-ls dev                  # :8787  (wrangler dev)
pnpm --filter profile-sync test              # vitest, Workers pool
pnpm --filter <svc> cf-typegen               # regenerate worker-configuration.d.ts after editing wrangler.jsonc
```

Node 22, pnpm 10. `apps/mobile` uses its own `npm install` (not the workspace).

## Conventions

- **TypeScript strict everywhere**; `noUncheckedIndexedAccess` is on in the
  services and `@ygb/shared`. `typecheck` is the real gate — profile-sync and
  course-ls have no eslint; web uses `next lint`.
- **The sync wire contract lives in `@ygb/shared`.** If you change what crosses
  the network between `apps/web` and `services/profile-sync`, change it there and
  rebuild shared (`pnpm --filter @ygb/shared build`) — don't redeclare types
  locally.
- **Wire format is snake_case** for rows the server returns (`profile_id`,
  `dob_hash`, …). The client posts camelCase raw IndexedDB rows. `profile-sync`
  bridges the two; keep it that way unless deliberately migrating the contract.
- Workers config is `wrangler.jsonc` (not `.toml`). `worker-configuration.d.ts`
  is generated but **committed** — regenerate with `cf-typegen`, never hand-edit.
  Do NOT add `wrangler types` back into the `typecheck`/`build` scripts (parallel
  turbo tasks race on the file).
- Secrets (`GOOGLE_MAPS_API_KEY`) are `wrangler secret` / `.dev.vars`, never in
  `wrangler.jsonc`. Augment the `Env` type in a `*.d.ts` (see
  `services/course-ls/src/worker-env.d.ts`).
- `NEXT_PUBLIC_*` values are **build-time** in Next — set via the deploy
  workflow's build env or a local `.env`, not `wrangler.jsonc` vars.
- Commit style: conventional prefixes (`feat(web):`, `fix(profile-sync):`, …).
  End commit messages with the `Co-Authored-By` / `Claude-Session` trailers the
  session specifies.

## Landmines / non-obvious things

- **`apps/web/lib/cloud-sync.ts` `applyChanges()` is known-buggy** (writes server
  UUID rows into Dexie's numeric keyspace; pushes whole tables not deltas). This
  was carried over from the old Laravel service on purpose. Don't "fix" it as a
  side quest — it's tracked in `docs/bugs.md` and needs a deliberate contract
  migration.
- **`profile-sync` push writes are sequential, not one atomic D1 batch.**
  Intentional — payloads are tiny and the client only advances its cursor on full
  success. Drizzle's `db.batch()` tuple typing made it not worth it.
- **`profile-sync` push must match the legacy Laravel `sync()` behaviour**, not
  the newer `pushChanges()` — the live client sends raw rows with numeric local
  ids and the server derives `external_id` (`course:7`) + resolves profile
  ownership course→profile. See `src/sync/push.ts`.
- **course-ls degrades gracefully** without `GOOGLE_MAPS_API_KEY` (returns 503)
  and without KV (edge cache only). Keep both paths working.
- `apps/web/stuff`, `apps/web/certificates/`, `apps/web/.vercel/` are gitignored
  local-only leftovers. `stuff` contains a plaintext credential — never commit or
  print it.
- `initOpenNextCloudflareForDev()` in `apps/web/next.config.ts` is guarded to
  dev only — it breaks `next build` if it runs there.
- Deploy jobs in `.github/workflows/deploy.yml` are gated on the repo variable
  `CLOUDFLARE_ACCOUNT_ID` being set. Until then only `ci.yml` runs.

## Before you finish

1. `pnpm turbo run typecheck lint test build` is green.
2. If you touched the sync contract: `@ygb/shared` rebuilt, both sides updated.
3. If you touched a `wrangler.jsonc`: ran `cf-typegen` and committed the result.
4. Docs updated if behaviour or setup changed (`docs/deploy.md`, the app README).
