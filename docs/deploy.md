# Deployment

All three services run on **Cloudflare** and deploy from GitHub Actions
(`.github/workflows/deploy.yml`) on every push to `main` that touches them.

| Service                       | Worker name        | Extras            |
| ----------------------------- | ------------------ | ----------------- |
| `apps/web`                    | `ygb-web`          | `@opennextjs/cloudflare`, Workers Assets |
| `services/profile-sync`       | `ygb-profile-sync` | D1 database `ygb-profile-sync` |
| `services/course-ls`          | `ygb-course-ls`    | KV `COURSE_CACHE`, `GOOGLE_MAPS_API_KEY` secret |

## Local config — one file

Everything you need locally goes in the repo-root **`.env`**:

```bash
cp .env.example .env      # then fill in the values
pnpm env:sync             # fans them out to apps/web/.env.local and services/course-ls/.dev.vars
```

`.env` holds: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
`GOOGLE_MAPS_API_KEY`, and the two `NEXT_PUBLIC_*` URLs. It is gitignored.
The root `pnpm deploy:*` and `pnpm cf:*` scripts load it automatically
(`scripts/with-env.sh`); alternatively run
`pnpm --filter profile-sync exec wrangler login` and leave the Cloudflare
values blank.

## One-time Cloudflare setup

### 1. API token

Create a token at **dash.cloudflare.com → My Profile → API Tokens** with:

- Account · Workers Scripts · Edit
- Account · D1 · Edit
- Account · Workers KV Storage · Edit
- Account · Account Settings · Read
- User · User Details · Read
- Zone · Workers Routes · Edit *(only if you attach custom domains)*

Shortcut: the **"Edit Cloudflare Workers"** token template covers everything
except D1 — add one row, `D1 · Edit`. Put the token and your Account ID in `.env`.

### 2. GitHub repo secrets & variables

**Settings → Secrets and variables → Actions**

| Kind     | Name                            | Value                                        |
| -------- | ------------------------------- | ------------------------------------------- |
| Secret   | `CLOUDFLARE_API_TOKEN`          | the token from step 1                        |
| Variable | `CLOUDFLARE_ACCOUNT_ID`         | any domain → Overview → right sidebar         |
| Variable | `NEXT_PUBLIC_SYNC_ENDPOINT`     | `https://ygb-profile-sync.<subdomain>.workers.dev/api` |
| Variable | `NEXT_PUBLIC_COURSE_LS_ENDPOINT`| `https://ygb-course-ls.<subdomain>.workers.dev` |

The `NEXT_PUBLIC_*` values are **build-time**, inlined into the web client
bundle. `CLOUDFLARE_ACCOUNT_ID` is not secret and is kept as a variable so it
can gate the deploy workflow — **the deploy jobs are skipped entirely until
`CLOUDFLARE_ACCOUNT_ID` is set**, so CI stays green before setup is done.

### 3. Google Places API key (course-ls)

1. Google Cloud console → enable **Places API (New)**.
2. Create an API key (APIs & Services → Credentials); restrict it to the Places
   API.
3. Put it in `.env` as `GOOGLE_MAPS_API_KEY`, then push it to the Worker:

   ```bash
   pnpm cf:secret:google
   ```

Without it, `/courses/search` returns `503` and the web form is a plain text
field.

### 4. Create the D1 database

```bash
pnpm cf:d1:create
```

Copy the printed `database_id` into `services/profile-sync/wrangler.jsonc`
(replace `REPLACE_WITH_D1_DATABASE_ID`) and commit.

### 5. Create the course-ls KV namespace

```bash
pnpm cf:kv:create
```

Copy the printed `id` into `services/course-ls/wrangler.jsonc` (replace
`REPLACE_WITH_KV_NAMESPACE_ID`) and commit.

### 6. First deploy (by hand)

Order matters: the web build bakes in the service URLs, so deploy the two
Workers first, then point web at them.

```bash
# 1. backend Workers
pnpm cf:migrate            # apply D1 migrations to the remote database
pnpm deploy:services       # deploys ygb-profile-sync + ygb-course-ls
```

Each `wrangler deploy` prints the Worker's URL, e.g.
`https://ygb-profile-sync.<subdomain>.workers.dev`.

```bash
# 2. put those URLs in .env, then re-sync and deploy web
#    NEXT_PUBLIC_SYNC_ENDPOINT=https://ygb-profile-sync.<subdomain>.workers.dev/api
#    NEXT_PUBLIC_COURSE_LS_ENDPOINT=https://ygb-course-ls.<subdomain>.workers.dev
pnpm env:sync
pnpm deploy:web            # opennext build + deploy → ygb-web
```

Also set the same two URLs as GitHub repo **variables** (step 2) so CI builds
web with them too.

`pnpm deploy:all` deploys all three at once — fine for later pushes once
the URLs are stable, but use the split flow for the first deploy.

### 7. (Optional) import existing sync data

The old Laravel SQLite database held a handful of test rows. Simpler to re-sync
from the web client than to script an import.

## How the workflows behave

- **`ci.yml`** — every PR and push to `main`: `pnpm turbo run typecheck lint
  test build`. `build` for the Workers services is `wrangler deploy --dry-run`
  (no auth needed); for web it is `next build`.
- **`deploy.yml`** — push to `main` (or manual dispatch), gated on
  `CLOUDFLARE_ACCOUNT_ID`. `dorny/paths-filter` decides which of web /
  profile-sync / course-ls changed (a `packages/shared` or lockfile change
  triggers web + profile-sync). Each job installs, builds `@ygb/shared`, then
  deploys. profile-sync also runs `wrangler d1 migrations apply --remote` first.

## Local dev

```bash
pnpm env:sync
pnpm --filter profile-sync exec wrangler d1 migrations apply ygb-profile-sync --local
pnpm --filter profile-sync dev      # :8787
pnpm --filter course-ls dev         # :8787 (use --port 8788 to run both)
pnpm --filter web dev               # :3002
pnpm --filter web preview           # opennext build on the Workers runtime
```
