Closes #

## What changed

## Deploy impact

Merging deploys to production. Tick what this PR redeploys:

- [ ] web (`app.yourbuddy.golf`)
- [ ] profile-sync (`api.yourbuddy.golf`), including a **D1 migration**: yes / no
- [ ] course-ls (`courses.yourbuddy.golf`)
- [ ] marketing (`yourbuddy.golf`)
- [ ] mobile (needs a separate EAS build; nothing ships on merge)

Old clients (installed PWAs on yesterday's JS) still work because:

Feature flag (name, default):

## Read this closely

1. `file`, `function`: what could be wrong, how to check
2.

## Checks

- [ ] `pnpm turbo run typecheck lint test build` passes (paste the summary below)
- [ ] Tests added for new service behaviour; no `.only`/`.skip`
- [ ] Web: manual check steps written below
- [ ] Offline behaviour checked or stated
- [ ] Touched `packages/shared`: rebuilt, both sides compile
- [ ] Touched a `wrangler.jsonc`: ran `cf-typegen`, result committed
- [ ] Docs updated

```
paste the turbo summary here
```

**How to check by hand:**

## Review

Reviewer / ui-auditor verdict and findings (logged in `docs/REVIEW_LOG.md`):

## Not checked
