# AGENTS.md

Guidance for AI coding agents working in this repo. Humans: see `README.md`.
Tool-agnostic: applies to the Orchestrator and every subagent. `PROCESS.md`
says _when_ (the gated workflow); this file says _who_ and _how_.
`SELF_IMPROVEMENT.md` is the lessons log.

## Ground rules

1. **The board is the source of truth for work.** GitHub Project "Your Golf
   Buddy" (see `PROCESS.md` §0-1). An approved spec in `docs/specs/` is the
   source of truth for what a feature does. Flag conflicts; don't resolve them
   silently.
2. One ticket = one issue = one branch (`<type>/<issue#>-<slug>`, type =
   `feat`/`fix`/`chore`) = one PR against `main`, built in its own worktree
   under `.worktrees/`. Stay inside the ticket's `files_touched`.
3. **Merging to `main` deploys to production.** Never push to `main`. Never
   merge. The human merges. Never stack PRs on ticket branches.
4. Every PR links its issue (`Closes #N`), passes
   `pnpm turbo run typecheck lint test build`, and pastes the summary output.
5. Small PRs (~300 changed lines). Bigger: ask the ticketer to split.
6. Don't add dependencies or edit `pnpm-lock.yaml` unless the ticket says so.
   Need one? Comment on the issue, label `blocked`, stop.
7. **Offline-first is the product.** Every change states its offline
   behaviour. Nothing on the scoring path may wait on the network.
8. **Old clients keep running.** Installed PWAs and the mobile WebView may run
   yesterday's JS against today's services. Contract and D1 changes are
   additive (expand, then contract in a later release).
9. Blocked or ambiguous: comment on the issue, label `blocked`, stop. Don't
   guess on requirements.
10. **Secrets.** Never read or print `.env`, `.env.*` (except `.env.example`),
    `.dev.vars`, `apps/web/stuff`, tokens or keys. Never put a secret in a
    prompt, issue, commit, PR or log. Never type a key into a `!` command; use
    `wrangler secret put` interactively.
11. Check `git status` before writing; never delete or overwrite files you
    didn't create. Never commit or delete `local/`.
12. **Honesty about verification.** Never say "verified", "tested" or "works"
    unless you ran the check in this session and can show the output. Quote
    real totals (passed and failed). State what you did NOT check. Mistakes
    (yours, other agents', tests') go in `docs/REVIEW_LOG.md`.
13. **The human must be able to defend every line.** Small functions, plain
    names, comments only where the _why_ isn't obvious, no clever
    abstractions. In PRs, point out the risky parts and how to check them.
14. **Never bypass the gates.** No `--no-verify`, no `.only`/`.skip` in merged
    tests, no disabling a CI step to go green. Fix the cause.
15. Log real process problems in `SELF_IMPROVEMENT.md`, each with an ACTION
    that changes a file.

## Roles (each is `.claude/agents/<name>.md`)

| Role              | Tools                               | Job |
| ----------------- | ----------------------------------- | --- |
| **orchestrator**  | all                                 | Runs `PROCESS.md`. Owns the board, worktrees, gates, independent checks, deploy watch. Doesn't write feature code. |
| **pm**            | Read, Write, Edit, Grep, Glob       | Writes the spec in `docs/specs/` from an issue: stories, scope, non-goals, acceptance criteria, offline behaviour, assumptions, risks. Applies the roadmap guardrail. Proposes, never decides, scope. |
| **architect**     | Read, Write, Edit, Grep, Glob, Bash | Fills the spec's Design section: what changes where, Dexie/D1 schema, `@ygb/shared` contract delta, backward-compat and migration plan, flags, rollback, what was deliberately not built. |
| **ticketer**      | Read, Write, Edit, Grep, Glob       | Fills the spec's Tickets table: S/M tickets, disjoint `files_touched`, checkable criteria, dependencies. Contract tickets first. |
| **developer**     | Read, Write, Edit, Grep, Glob, Bash | Implements exactly one ticket in its worktree, with tests (services) or a written manual check (web). Reports done with check output. Doesn't push or open the PR. |
| **sync-engineer** | Read, Write, Edit, Grep, Glob, Bash | Developer for anything touching `services/profile-sync`, the sync types in `packages/shared`, or `apps/web/lib/cloud-sync.ts`. Owns auth scoping, migrations, push/pull semantics. |
| **reviewer**      | Read, Grep, Glob, Bash              | Read-only diff review: criteria met, correctness, edge cases, offline and old-client behaviour, tests meaningful, security (auth scoping, secrets), scope creep. Ranks blocker / should-fix / nit. Lists 2-3 "read this closely" items. |
| **ui-auditor**    | Read, Grep, Glob, Bash              | Read-only: Broadsheet design rules (below), outdoor legibility, glare mode, 44px targets, keyboard/VoiceOver, labels, focus, contrast. Blockers fixed before a UI PR opens. |
| **tester**        | Read, Write, Edit, Grep, Glob, Bash | Adds missing tests (tests-only PRs), smoke-tests the live URLs after deploy, fills the spec's Verification table with evidence, writes `HUMAN TODO` steps. |

## Models

The human is on a usage-limited Claude plan, so tokens matter.

- **Orchestrator and judgment roles** (pm, architect, ticketer, reviewer,
  ui-auditor, sync-engineer): the session model (Opus), `model: inherit`.
- **developer and tester**: `model: sonnet`. A weaker implementer is fine
  because the independent check and the reviewers catch problems; a weaker
  reviewer is not.
- Default parallelism is **2** concurrent subagents.

## What this is

Your Golf Buddy — an offline-first golf score tracker. A **pnpm + Turborepo
monorepo**, all TypeScript, everything deploys to **Cloudflare**.

```
apps/web/              Next.js 15 PWA (the product). Cloudflare Workers via @opennextjs/cloudflare.
apps/mobile/           Expo native shell — one full-screen WebView on the deployed web app. NOT a pnpm workspace member (own `npm install`).
services/profile-sync/ Hono + Workers + D1 + Drizzle. Cursor-based cloud sync.
services/course-ls/    Hono + Workers. Golf-course typeahead wrapping Google Places + a 2-tier cache.
packages/shared/       @ygb/shared — wire contracts (types + zod). Imported by web + both services.
docs/                  Architecture / deploy / roadmap docs.
```

## Commands

```bash
pnpm install
cp .env.example .env && pnpm env:sync        # one config file → apps/web/.env.local + services/course-ls/.dev.vars
pnpm turbo run typecheck lint test build     # everything CI runs — run before you finish
pnpm --filter web dev                        # :3002
pnpm --filter profile-sync dev               # :8787  (wrangler dev)
pnpm --filter course-ls dev                  # :8788  (wrangler dev)
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
- **profile-sync auth**: every `/sync/*` call carries `Authorization: Bearer
  <profileId>` (the UUID *is* the credential — capability model). `src/auth.ts`
  validates + rate-limits; every query in `src/sync/*` is scoped to
  `c.get("profileId")`. Never add an unscoped query.
- Workers config is `wrangler.jsonc` (not `.toml`). `worker-configuration.d.ts`
  is generated but **committed** — regenerate with `cf-typegen`, never hand-edit.
  Do NOT add `wrangler types` back into the `typecheck`/`build` scripts (parallel
  turbo tasks race on the file).
- Secrets (`GOOGLE_MAPS_API_KEY`) are `wrangler secret` / `.dev.vars`, never in
  `wrangler.jsonc`. Augment the `Env` type in a `*.d.ts` (see
  `services/course-ls/src/worker-env.d.ts`).
- `NEXT_PUBLIC_*` values are **build-time** in Next — set via the deploy
  workflow's build env or `apps/web/.env.local`, not `wrangler.jsonc` vars.
- **One config file: repo-root `.env`** (gitignored). `pnpm env:sync` generates
  `apps/web/.env.local` and `services/course-ls/.dev.vars` from it — those are
  generated, don't hand-edit or commit them. `scripts/with-env.sh` loads `.env`
  for the `pnpm deploy:*` / `pnpm cf:*` scripts.
- Commit style: conventional prefixes (`feat(web):`, `fix(profile-sync):`, …).
  End commit messages with the `Co-Authored-By` / `Claude-Session` trailers the
  session specifies.

## Landmines / non-obvious things

- **Sync** (`apps/web/lib/cloud-sync.ts`): `performSync` always pushes then pulls
  — do NOT re-add a `/sync/state` `{inSync}` short-circuit (it can't see unpushed
  local data). `applyChanges` maps server rows → local Dexie shape by
  `external_id` → local numeric id. Remaining weaknesses (cross-device id
  collisions, whole-table pushes) are in `docs/bugs.md` — a deliberate design
  pass, not a side quest.
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
- **Merging to `main` runs `wrangler d1 migrations apply --remote`** before the
  profile-sync deploy. A bad migration hits production data with no staging in
  between, and `wrangler rollback` doesn't undo it. Migrations are additive
  only, and get the `migration` label.
- The Golf Buddy Pass is **built but dark** behind `PUBLIC_PASS_ENABLED`,
  `NEXT_PUBLIC_PASS_ENABLED`, `PASS_ENABLED`, `PASS_ENFORCED` (see
  `docs/pass.md`). Flipping any of them is a human decision.
- `apps/web` has **no unit test runner** (only `profile-sync` and `course-ls`
  run vitest). Web tickets ship a written manual check until one is added.
- pnpm workspaces don't resolve through the parent repo from a worktree: run
  `pnpm install --frozen-lockfile` in each new `.worktrees/<n>`.
- Dev servers use fixed ports (3002 / 8787 / 8788). Parallel agents must pass
  their own `--port` or one run silently tests another worktree's build.

## Broadsheet design rules (apps/web and sites/marketing)

Tokens live in `apps/web/app/globals.css` and `sites/marketing/src/styles/global.css`.

- **No dark mode, ever.** The app is used outdoors in direct sun.
- **Every state survives greyscale.** Magenta (`--bs-state`) only reinforces a
  luminance change. Cyan (`--bs-accent`) is the text caret only.
- Controls are "keys": 1.5px ink border, 2px radius, weight 600. Selected =
  inverted to ink plus inset magenta bar. 44px minimum hit target; keys 52-78px.
- Glare mode (`data-glare="on"` on `<html>`): ink and paper only, +15% type, keys ≥60px.
- **System fonts only.** No webfonts.

## Before you finish

1. `pnpm turbo run typecheck lint test build` is green.
2. If you touched the sync contract: `@ygb/shared` rebuilt, both sides updated.
3. If you touched a `wrangler.jsonc`: ran `cf-typegen` and committed the result.
4. Docs updated if behaviour or setup changed (`docs/deploy.md`, the app README).
5. Working a ticket: the independent check in `PROCESS.md` §4.5 passed, review
   findings logged in `docs/REVIEW_LOG.md`, PR opened with the template.


## Rules

1. Do not commit or delete the `local` directory. Its for rough ideas and design specs
