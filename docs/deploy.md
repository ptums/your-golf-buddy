# Deployment

All three services run on **Cloudflare** and deploy from GitHub Actions
(`.github/workflows/deploy.yml`) on every push to `main` that touches them.

| Service                       | Worker name        | Extras            |
| ----------------------------- | ------------------ | ----------------- |
| `apps/web`                    | `ygb-web`          | `@opennextjs/cloudflare`, Workers Assets |
| `services/profile-sync`       | `ygb-profile-sync` | D1 database `ygb-profile-sync` |
| `services/course-ls`          | `ygb-course-ls`    | KV `COURSE_CACHE`, `GOOGLE_MAPS_API_KEY` secret |

## One-time setup

Everything below is manual and only needs doing once. The workflows assume it
is already done.

### 1. Cloudflare API token

Create a token at **dash.cloudflare.com → My Profile → API Tokens** with:

- Account · Workers Scripts · Edit
- Account · D1 · Edit
- Account · Workers KV Storage · Edit *(course-ls cache)*
- Account · Account Settings · Read
- User · User Details · Read
- Zone · Workers Routes · Edit *(only if you attach custom domains)*

Shortcut: the **"Edit Cloudflare Workers"** token template covers everything
except D1 — add one row, `D1 · Edit`.

### 2. GitHub repo secrets & variables

**Settings → Secrets and variables → Actions**

| Kind     | Name                            | Value                                        |
| -------- | ------------------------------- | ------------------------------------------- |
| Secret   | `CLOUDFLARE_API_TOKEN`          | the token from step 1                        |
| Variable | `CLOUDFLARE_ACCOUNT_ID`         | dashboard → any domain → Account ID          |
| Variable | `NEXT_PUBLIC_SYNC_ENDPOINT`     | `https://ygb-profile-sync.<subdomain>.workers.dev/api` |
| Variable | `NEXT_PUBLIC_COURSE_LS_ENDPOINT`| `https://ygb-course-ls.<subdomain>.workers.dev` |

The two `NEXT_PUBLIC_*` values are **build-time**, inlined into the web client
bundle. `CLOUDFLARE_ACCOUNT_ID` is not secret and is kept as a variable so it
can gate the deploy workflow — **the deploy jobs are skipped entirely until
`CLOUDFLARE_ACCOUNT_ID` is set**, so CI stays green before setup is done.

### 2b. Google Places API key (course-ls)

1. Google Cloud console → enable **Places API (New)**.
2. Create an API key (APIs & Services → Credentials); restrict it to the Places
   API and, ideally, to your Worker's requests.
3. Store it on the Worker:

   ```bash
   pnpm --filter course-ls exec wrangler secret put GOOGLE_MAPS_API_KEY
   ```

   Locally: `cp services/course-ls/.dev.vars.example services/course-ls/.dev.vars`
   and put the key there. Without it, `/courses/search` returns `503` and the
   web form is a plain text field.

### 3. Create the D1 database

```bash
cd services/profile-sync
pnpm exec wrangler d1 create ygb-profile-sync
```

Copy the printed `database_id` into `services/profile-sync/wrangler.jsonc`
(replace `REPLACE_WITH_D1_DATABASE_ID`) and commit.

### 3b. Create the course-ls KV namespace

```bash
pnpm --filter course-ls exec wrangler kv namespace create COURSE_CACHE
```

Copy the printed `id` into `services/course-ls/wrangler.jsonc` (replace
`REPLACE_WITH_KV_NAMESPACE_ID`) and commit. (The service runs without it — edge
cache only — but KV gives you the global cache layer.)

### 4. First deploy of each Worker

The `wrangler deploy` in CI will create the Workers on first run. If you want to
do it by hand first:

```bash
pnpm --filter profile-sync exec wrangler d1 migrations apply ygb-profile-sync --remote
pnpm --filter profile-sync exec wrangler deploy
pnpm --filter course-ls exec wrangler deploy
NEXT_PUBLIC_SYNC_ENDPOINT=https://ygb-profile-sync.<subdomain>.workers.dev/api \
  pnpm --filter web deploy
```

### 5. (Optional) import existing sync data

The old Laravel SQLite database held a handful of test rows. To carry them over,
export from the old `.sqlite` and load into D1 — normalise timestamps to
ISO-8601 first (`YYYY-MM-DD HH:MM:SS` → `YYYY-MM-DDTHH:MM:SS.000Z`). For the
current dataset it is simpler to re-sync from the web client.

## How the workflows behave

- **`ci.yml`** — every PR and push to `main`: `pnpm turbo run typecheck lint
  test build`. `build` for the Workers services is a `wrangler deploy --dry-run`
  (no auth needed); for web it is `next build`.
- **`deploy.yml`** — push to `main` (or manual dispatch). `dorny/paths-filter`
  decides which of web / profile-sync / course-ls changed (a change to
  `packages/shared` or the lockfile triggers web + profile-sync). Each job runs
  `pnpm install`, builds `@ygb/shared`, then deploys. profile-sync also runs
  `wrangler d1 migrations apply --remote` before deploying.

## Local equivalents

```bash
pnpm --filter profile-sync exec wrangler d1 migrations apply ygb-profile-sync --local
pnpm --filter profile-sync dev      # :8787
pnpm --filter course-ls dev         # :8787
pnpm --filter web preview           # opennext build on the Workers runtime
```
