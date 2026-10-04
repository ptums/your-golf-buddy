# SELF_IMPROVEMENT.md

A running log of what went wrong or right in the agent workflow, and the
concrete change that follows.

## Rules

- Append only. Newest at the bottom of the Log.
- Every entry ends with an **ACTION** that changes a file (`AGENTS.md`,
  `PROCESS.md`, a subagent in `.claude/agents/`, CI, a template). "Be more
  careful" is not an action.
- The Orchestrator reads the Log during preflight, appends at any gate or
  failure, and writes a retro at the end of every full cycle.
- Apply approved actions in a PR labelled `process`.
- Never log secrets.

## Entry format

```
### [YYYY-MM-DD] <phase> / <agent>
OBSERVED: what happened (link the PR/issue/run)
CAUSE: best guess at why
ACTION: exact change (file + what)
STATUS: proposed | applied (PR #) | rejected (why)
```

## Seeded lessons

Carried over from the `local-parks-candidate-project` run (Oct 2026) and this
repo's own history. The actions are already baked into the docs.

1. **Parallel agents share fixed dev ports.** In the parks run, one agent's e2e
   run silently tested another worktree's build. ACTION (applied): `PROCESS.md`
   §4.4 step 3 and `AGENTS.md` landmines: parallel agents pass their own `--port`.
2. **Stacked PRs got merged into their ticket-branch bases, not `main`.**
   ACTION (applied): `AGENTS.md` rule 3 and `PROCESS.md` §4.7: every PR
   targets `main`; dependents wait for their parent to merge.
3. **Agent-reported numbers were wrong until recomputed** (contrast ratios,
   "18 passed" read from the last log line that hid 2 failures). ACTION
   (applied): `AGENTS.md` rule 12 and `PROCESS.md` §2: quote real passed and
   failed totals; the orchestrator re-runs every check itself (§4.5).
4. **A key was typed into a `!` command** and landed in the transcript.
   ACTION (applied): `AGENTS.md` rule 10: never type a key into a command; use
   interactive `wrangler secret put`.
5. **A settings deny glob (`.env.*`) also blocked `.env.example`** (deny beats
   allow). ACTION (applied): `.claude/settings.json` lists explicit deny paths.
6. **Pushing to a PR branch after telling the human it was ready to merge**
   stranded a commit. ACTION (applied): `PROCESS.md` §2 "Never".
7. **Two tickets that each passed alone failed together.** ACTION (applied):
   `PROCESS.md` §4.8 step 2 rebases open branches after each merge and re-runs
   the independent check.
8. **Deploy config needs execution, not just reading.** A health check that
   always returns 200 checks nothing. ACTION (applied): this repo's deploy
   health checks assert on a body (`"ok":true`); `PROCESS.md` §4.8 watches the
   run and smoke-tests after every merge.
9. **Sync looked fine but nothing ever reached the server** (Sept 2026): an
   `{inSync}` short-circuit couldn't see unpushed local data. ACTION (applied):
   `AGENTS.md` landmine; reviewer and sync-engineer definitions require a
   two-device / offline-then-online check for sync changes.
10. **`wrangler types` in parallel turbo tasks raced and truncated the
    generated file.** ACTION (applied): `AGENTS.md` conventions: `cf-typegen`
    by hand, committed.

## Log

(Entries from runs go below.)
