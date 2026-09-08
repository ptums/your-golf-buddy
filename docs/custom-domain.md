# Custom domain — `yourbuddy.golf`

| Host | Worker |
| ---- | ------ |
| `yourbuddy.golf` | `ygb-web` (the app) |
| `api.yourbuddy.golf` | `ygb-profile-sync` |
| `courses.yourbuddy.golf` | `ygb-course-ls` |

Adding `routes` to a Worker **disables its `*.workers.dev` subdomain** (unless
you also set `"workers_dev": true`). So once a Worker has a custom-domain route,
`ygb-*.peter-686.workers.dev` returns 404 — the client must call the custom
domain. Flip the repo variables (§3) in the *same* deploy that adds the routes.

## 1. Add the zone to Cloudflare (manual, one-time)

1. **dash.cloudflare.com → Add a site → `yourbuddy.golf`** → Free plan.
2. Cloudflare prints two nameservers.
3. At the registrar where you bought the domain, replace the nameservers with
   those two.
4. Wait for the zone to show **Active** in Cloudflare (minutes–hours).

Nothing else here needs the DNS records created by hand — the Workers create
their own (`custom_domain: true` in each `wrangler.jsonc`).

## 2. Deploy the routes

The `routes` blocks in the three `wrangler.jsonc` files are live as of the zone
going Active — each `wrangler deploy` creates its hostname's DNS record + TLS
cert automatically. Push to `main` (or `pnpm deploy:services` + `pnpm deploy:web`).

## 3. Point the web build at the new URLs

**GitHub → Settings → Secrets and variables → Actions → Variables:**

| Name | New value |
| ---- | --------- |
| `NEXT_PUBLIC_SYNC_ENDPOINT` | `https://api.yourbuddy.golf` |
| `NEXT_PUBLIC_COURSE_LS_ENDPOINT` | `https://courses.yourbuddy.golf` |

Then trigger a web deploy (push any change under `apps/web/`, or re-run the
Deploy workflow) so the new endpoints are baked into the client bundle.

`apps/mobile/app.json` → `expo.extra.webUrl` is `https://yourbuddy.golf`;
rebuild the app with EAS after changing it.

## 4. Verify

```bash
curl -sI https://yourbuddy.golf | head -1
curl -s  https://api.yourbuddy.golf/v1/health           # {"ok":true}
curl -s  "https://courses.yourbuddy.golf/courses/search?q=pebble+beach" | head -c 80
```

Open `https://yourbuddy.golf`, register/restore a profile, add a round,
enable sync — confirm the network calls go to `api.yourbuddy.golf` and
succeed. (`yourbuddy.golf` also serves the app.)

## 5. Tighten (after it's confirmed working)

- Drop `https://ygb-web.peter-686.workers.dev` from `CORS_ORIGINS` in both
  services' `wrangler.jsonc`.
- Optional: a Cloudflare **Redirect Rule** `www.yourbuddy.golf/* → yourbuddy.golf/$1`
  (301) if you don't want `www` serving a duplicate.
- Optional: `disable_worker_dev` on the Workers so only the custom domain
  answers.
