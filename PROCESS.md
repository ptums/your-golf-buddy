# PROCESS.md: Orchestrator Playbook

**Trigger.** When the human says one of these, you are the **Orchestrator**. Read
`AGENTS.md` (roles, stack, rules) and `SELF_IMPROVEMENT.md` (lessons) first, then
follow this file.

| The human says                              | Lane                                                     |
| ------------------------------------------- | -------------------------------------------------------- |
| _"run process.md on #N"_ / _"… on <idea>"_  | **Full cycle** for one feature or epic (sections 4.1-4.8) |
| _"work the board"_                          | Pick up every `Ready` card, Build → PR (4.4-4.8)          |
| _"fix #N"_                                  | **Fast lane** (section 5): small bug, no spec             |

Your Golf Buddy is a **live product**. Merging to `main` deploys to production
(`.github/workflows/deploy.yml`, including remote D1 migrations). There is no
staging. Every gate below exists because of that.

```
Intake -> Spec -> Plan -> Build (parallel worktrees) -> Review -> PR -> Merge = deploy -> Verify -> Retro
            G1      G2                                             G3                  G4
```

G = human gate. Between gates, run on your own.

---

## 0. Project config (nothing here is secret)

| Key                 | Value                                                   |
| ------------------- | ------------------------------------------------------- |
| GH_OWNER            | `ptums`                                                 |
| GH_REPO             | `your-golf-buddy`                                       |
| GH_PROJECT_NUMBER   | `3` (board "Your Golf Buddy")                           |
| APP_URL             | https://app.yourbuddy.golf                              |
| SYNC_URL            | https://api.yourbuddy.golf (health: `/v1/health`)       |
| COURSE_LS_URL       | https://courses.yourbuddy.golf (health: `/health`)      |
| MARKETING_URL       | https://yourbuddy.golf                                  |

Never read `.env`, `.dev.vars` or `apps/web/stuff` to find config.

## 1. The board

GitHub Project **"Your Golf Buddy"** is the single place work is tracked.
Issues are the units; the board's fields carry the state.

| Field    | Values                                               | Who moves it                                            |
| -------- | ---------------------------------------------------- | ------------------------------------------------------- |
| Status   | Backlog · Ready · In progress · In review · Done     | Orchestrator; GitHub moves to Done when the PR merges  |
| Priority | P0 (broken for users) · P1 (next) · P2 (someday)     | Human; orchestrator proposes                            |
| Size     | S (≤ ~150 lines, one area) · M (≤ ~300 lines) · L    | Ticketer. L is never built: split it                    |

Labels: type (`feature`, `bug`, `chore`, `process`, `epic`), area (`area:web`,
`area:profile-sync`, `area:course-ls`, `area:mobile`, `area:shared`,
`area:marketing`, `area:infra`), and flags (`blocked`, `needs-human`,
`sync-contract`, `migration`). A card is `Ready` only when it has acceptance
criteria, `files_touched`, and no open dependency.

Board commands (field and option ids come from `gh project field-list
<GH_PROJECT_NUMBER> --owner ptums --format json`):

```bash
gh project item-add 3 --owner ptums --url <issue-url>
gh project item-edit --project-id <PVT_…> --id <item-id> --field-id <field-id> --single-select-option-id <option-id>
```

Status edits are best effort. If one fails, say so in the gate message; don't retry in a loop.

## 2. Operating rules

**On your own (no asking):** reading files, creating branches and worktrees,
writing code and docs inside a ticket, running typecheck/lint/test/build,
`gh` and `git` reads, creating issues and labels, moving cards, opening PRs,
commenting on issues and PRs, watching CI and deploy runs, curling the public
health endpoints.

**Ask first (a gate or a question):** approving a spec or tickets, merging
anything, pushing to `main`, running `wrangler deploy` / `wrangler secret` /
`wrangler d1 … --remote` / anything that touches production data, changing
GitHub secrets or variables, flipping a feature flag in a `wrangler.jsonc`
(`PASS_ENABLED`, `PASS_ENFORCED`, …), deleting files you did not create,
anything that costs money.

**Never:** read or print `.env`, `.dev.vars`, `apps/web/stuff`, tokens or keys;
put a secret in a prompt, issue, commit, PR or log; commit or delete `local/`;
bypass CI (`--no-verify`, `.only`/`.skip`, disabling a check); merge your own
PR; push to a PR branch after telling the human it's ready to merge (open a new
PR instead).

**Honesty about verification.** Never write "verified", "tested" or "works"
unless you ran the check in this session and can show the output. Quote the
real summary line (passed **and** failed counts), never an agent's claim or the
last line of a log. Say what you did NOT check. Mistakes go in
`docs/REVIEW_LOG.md`.

**Asking well.** One message per gate: what was done (3-6 lines), what needs
deciding, your recommendation, the exact next step if approved. Batch
questions. Don't ask what the docs already answer.

**Waiting is not idle.** While waiting on the human, only do work that doesn't
depend on their answer. If there is none, stop and say what you're waiting on.

**Usage.** The human is on a usage-limited Claude plan and can see the meters;
you can't. For a full cycle, ask for a one-line reading at G1. If the session
meter is past ~50%, cap parallelism at 1 and keep the orchestrator on Sonnet
(`/model`). If a limit hits mid-run, the board, branches and
`docs/REVIEW_LOG.md` must be current enough to resume.

## 3. Before every cycle (preflight, ~2 minutes, no gate unless something fails)

1. `git status` clean on `main`, `git pull`. Unexpected changes you didn't make: stop and tell the human.
2. `gh auth status`; `gh project view 3 --owner ptums` works.
3. Read the **Log** section of `SELF_IMPROVEMENT.md` for open actions.
4. `pnpm turbo run typecheck lint test build` is green on `main`. If it isn't, that's the first ticket.

## 4. Full cycle

### 4.1 Intake

Turn the request into one issue (or find the existing one): problem, who it's
for, why now. Label `feature` or `epic` and an area. Put it on the board as
`Backlog`. Check it against the roadmap guardrail (`docs/roadmap.md`): _if it
doesn't improve scoring, club knowledge or practice drills, park it_. Say so
if it fails that test; the human decides.

### 4.2 Spec (auto, then G1)

1. Spawn **pm** → `docs/specs/<issue#>-<slug>.md` from `docs/specs/TEMPLATE.md`:
   problem, user stories, scope and explicit non-goals, acceptance criteria,
   offline behaviour, assumptions, risks, open questions.
2. Spawn **architect** (in the same turn if the problem is clear; after the pm
   if not) to fill the spec's **Design** section: which apps/services change,
   data model and Dexie/D1 changes, the `@ygb/shared` contract delta, migration
   plan (backward compatible with installed PWAs that haven't reloaded),
   feature flag if risky, rollback, what was deliberately not built.
3. **G1:** a one-screen summary: scope, non-goals, the design in ≤10 lines,
   risky bits (sync, migrations, flags), open questions, a usage reading
   request. On approval, set the spec's status to `APPROVED`.

### 4.3 Plan (auto, then G2)

1. Spawn **ticketer** to fill the spec's **Tickets** table: ≤6 tickets per
   cycle, each S or M, with checkable acceptance criteria, `files_touched`,
   `depends_on`, area. Tickets that can run in parallel have disjoint
   `files_touched`. Contract changes to `packages/shared` are their own ticket
   and go first.
2. Show the table plus a mermaid dependency graph.
3. **G2:** the human approves, cuts or reorders. Then for each ticket:
   `gh issue create` (title `[<parent#>] <title>`, body = the ticket from the
   spec, `Part of #<parent>`), labels, add to the board, set Size. Only
   dependency-free tickets go to `Ready`. Write the issue numbers back into the
   spec.

### 4.4 Build (parallel, automatic)

For each `Ready` ticket, max **2** concurrent by default:

1. Worktree: `git worktree add .worktrees/<issue#> -b <type>/<issue#>-<slug> origin/main`,
   then `pnpm install --frozen-lockfile` inside it (pnpm workspaces don't
   resolve through the parent repo's `node_modules`; the store makes it fast).
   Move the card to `In progress`.
2. Spawn the matching subagent (**developer**, or **sync-engineer** for
   anything touching `profile-sync`, `packages/shared` sync types or
   `apps/web/lib/cloud-sync.ts`) with: the ticket text, its `files_touched`,
   the worktree path, the spec path. Launch concurrent subagents in the same
   turn.
3. Parallel agents must not start dev servers on the default ports
   (3002/8787/8788). If a ticket needs a running server, pass an explicit port
   (`--port`) and stop it when done.

### 4.5 Independent check (you, before any review)

In the worktree:

```bash
pnpm turbo run typecheck lint test build
git diff --stat origin/main          # only files_touched changed?
git diff origin/main | grep -nE 'sk_live|sk_test|whsec_|AIza|Bearer [0-9a-f-]{36}' || true
```

Plus, when relevant:

- touched `packages/shared` → `pnpm --filter @ygb/shared build`, and both sides compile against it
- touched a `wrangler.jsonc` → `pnpm --filter <svc> cf-typegen` ran and the result is committed
- touched `apps/mobile` → `cd apps/mobile && npm ci && npm run typecheck`
- added a D1 migration → applies cleanly locally (`wrangler d1 migrations apply ygb-profile-sync --local`) and old clients still work against the new schema

Reject when: new behaviour has no test (services) or no written manual check
(web has no unit test runner yet: the PR must list the exact steps the
reviewer/human can run); any `.only`/`.skip`; files outside `files_touched`
without a reason. If the agent claimed green and it isn't, log it in
`docs/REVIEW_LOG.md`.

### 4.6 Review (automatic)

Spawn **reviewer** on every diff, and **ui-auditor** for anything under
`apps/web/app`, `apps/web/components` or `sites/marketing/src`, read-only, in
the same turn. Blockers go back to the developer; max 2 rounds, then label the
issue `blocked` + `needs-human` and raise it at the next gate. Append every
finding of should-fix or above (and anything the independent check or CI
caught) to `docs/REVIEW_LOG.md`.

### 4.7 PR (then G3)

Push the branch, `gh pr create` against `main` with the template (`Closes #N`,
check output, review summary, deploy impact, "read this closely"). Move the
card to `In review`. Never stack PRs on other ticket branches; if B needs A,
wait for A to merge.

**G3 (repeat per batch):** list each PR in recommended merge order: number,
title, one-line summary, reviewer verdict, **deploy impact** (which workers
redeploy, migration yes/no, flag state), and **"Read these closely" (2-3
items)**: file and function, what could be wrong, how to check. The human is
accountable for every line, so point at what most deserves their eyes. Then
stop: _"Reply `merged` when done, plus any findings you want logged."_

### 4.8 Merge = deploy, then verify (G4)

On `merged`:

1. Log the human's findings in `docs/REVIEW_LOG.md` (found by: human).
2. `git fetch`, `gh pr list --state merged`, remove merged worktrees
   (`git worktree remove .worktrees/<n>`), rebase any open branch that now
   conflicts, move newly unblocked tickets to `Ready` and dispatch them.
3. Watch the deploy: `gh run list --workflow deploy.yml -L 3`, `gh run watch <id>`.
   On failure: `gh run view <id> --log-failed`, open a `bug` issue, fix it via
   the fast lane, and add a `SELF_IMPROVEMENT.md` entry.
4. Smoke test (spawn **tester**, or do it yourself for small changes):
   health endpoints from section 0, plus the ticket's own manual check against
   `APP_URL`. Record what was checked in the spec's **Verification** section,
   each row labelled automated / agent / human with evidence.
5. **G4:** tell the human what's live, what was checked, and the `HUMAN TODO`
   rows (on a real phone, outdoors / glare mode, offline then back online,
   sync across two devices). Rollback if production is broken:
   `wrangler rollback` for the affected worker (ask first; D1 migrations are
   not rolled back by it).

### 4.9 Retro (end of every full cycle)

Append to `SELF_IMPROVEMENT.md` for every real process problem (blocked
agents, merge conflicts, CI or deploy surprises, wrong agent claims, review
findings that a check should have caught). Each entry ends with an ACTION that
changes a file. Close the parent issue when its tickets are done; update docs
the change affected (`README.md`, app READMEs, `docs/deploy.md`).

## 5. Fast lane (`"fix #N"`)

For a bug or chore that is **size S, one area, no contract change, no
migration, no flag**. Otherwise use the full cycle.

1. Preflight (section 3).
2. Reproduce first and write down how (or say plainly you couldn't).
3. Worktree, **developer**, independent check, **reviewer** (+ **ui-auditor**
   for UI), PR, G3, merge, deploy watch, smoke test. Same rules as 4.4-4.8;
   no spec file (the issue body is the spec).

## 6. Ticket shape (in the spec's Tickets table and the issue body)

```markdown
**Parent:** #<n> · **Area:** web · **Size:** S · **Depends on:** #<n> / none

**Context:** what and why, approach hints.

**Acceptance criteria**
- [ ] checkable by someone who didn't see your reasoning
- [ ] offline behaviour stated (works offline / degrades with message / n/a)

**files_touched:** `apps/web/components/rounds/**`, `apps/web/lib/score.ts`

**How to check:** commands or click-path the reviewer and human can run.
```

## 7. Failure handling

- Subagent stuck or looping: one retry with a sharper prompt, then label `blocked` and raise it at the next gate.
- Merge conflict: rebase onto `main`; if non-trivial, send it back to the developer and re-run the independent check.
- CI red on a PR: fix in the branch; never bypass.
- Deploy red after merge: production may be half-deployed (workers deploy independently). Check each health URL, tell the human immediately, fast-lane the fix.
- Unexpected working-tree changes you didn't make: stop and tell the human.

## 8. Ledgers

**`docs/REVIEW_LOG.md`**, append-only:
`| # | Issue/PR | Finding | Severity | Found by | How found | Fix (commit/PR) | Status |`
Found by = reviewer / ui-auditor / independent check / CI / deploy / human / agent self-report.

**Spec Verification section** (per feature):
`| Check | Type (automated / agent / human) | Result | Evidence | Date |`

Checks that passing tests miss, include where relevant:

- Offline: airplane mode mid-round; data survives a reload; back online syncs once, no duplicate rows
- Two devices: same profile key on a second browser; edits on both converge (watch for the known id-collision bug)
- Installed PWA that hasn't reloaded still works after the deploy (old client vs new server/schema)
- Phone viewport, one-handed, 44px targets; glare mode on; greyscale (macOS: Accessibility → Display → Color filters)
- Course search with no `GOOGLE_MAPS_API_KEY` locally (503 path) and with a slow network
- Keyboard and VoiceOver on the changed screen

## 9. Definition of done (per feature)

Every ticket merged and deployed; `pnpm turbo run typecheck lint test build`
green on `main`; the deploy run green and health endpoints OK; the spec's
Verification table filled, with `HUMAN TODO` rows handed over; findings in
`docs/REVIEW_LOG.md`; docs updated; retro entry in `SELF_IMPROVEMENT.md` if
anything went wrong; parent issue closed.
