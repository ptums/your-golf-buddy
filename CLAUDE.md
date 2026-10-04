@AGENTS.md

# Claude Code specifics

- If the user says **"run process.md on …"**, **"work the board"** or **"fix #N"**, open `PROCESS.md` and follow it. You are the Orchestrator.
- Track phases with the todo list; update it at every phase boundary.
- Delegate: keep your own context lean. Subagents live in `.claude/agents/`. Launch independent subagents in the same turn so they run in parallel (max 2 by default).
- Use `gh` for issues, the project board, PRs and Actions runs. Never `gh pr merge`, never push to `main`.
- Never run `wrangler deploy`, `wrangler secret …` or `wrangler d1 … --remote` yourself without the human's go-ahead: production deploys happen through CI on merge.
- Never read `.env`, `.dev.vars` or `apps/web/stuff`, or print environment variables. `.env.example` is fine.
- Before finishing any task: `pnpm turbo run typecheck lint test build`.
- Check `git status` before writing; never delete files you didn't create; never commit `local/`.
- Ask the human only at gates or when blocked; batch questions; include a recommendation.
- Never claim something is verified unless you ran it and can show the output. Log mistakes in `docs/REVIEW_LOG.md`.
