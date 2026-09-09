# Marketing site — `yourbuddy.golf`

Status: **planned, not built.** Decisions locked 2026-09-08.

An Astro static site at the apex domain that sells the app and links into it.
The app itself moves to `app.yourbuddy.golf`.

## Decisions

| Question | Answer |
| -------- | ------ |
| Business model | App is free and fully usable offline. A **one-time "Golf Buddy Pass" unlocks cloud sync + cross-device.** Enforced server-side in `profile-sync`. |
| Price | **$9 one-time.** |
| Payment | **Stripe Payment Link.** Buyer redirected to `/welcome?session_id=…`; a Worker verifies the Stripe session and issues an HMAC-signed pass key; the buyer pastes it into the app's Settings. Sales-tax/VAT registration is the owner's responsibility (revisit Lemon Squeezy / Paddle if that becomes a burden). |

## Where it lives  *(scaffolded — phase 2 done)*

- Workspace glob `sites/*` in `pnpm-workspace.yaml`; package `marketing`.
- Astro 7, `output: "static"` (default), zero JS shipped. `build.format: "file"`
  (`/privacy.html`, served extensionless by Workers Assets). Integrations:
  `@astrojs/sitemap`; Tailwind v4 via `@tailwindcss/vite` + `@tailwindcss/typography`,
  brand tokens mirroring `apps/web` in `src/styles/global.css`.
- Deploys as a **static-assets-only** Cloudflare Worker (no `main`).
  `sites/marketing/wrangler.jsonc`: `name = "ygb-marketing"`,
  `assets.directory = "./dist"`, `not_found_handling: "404-page"`. **No routes
  yet** — deploys to `ygb-marketing.<subdomain>.workers.dev` until phase 3 adds
  the apex routes (and removes `yourbuddy.golf` from `apps/web/wrangler.jsonc`).
- `turbo.json` needs no change — `build` already outputs `dist/**`; `typecheck`
  runs `astro check`.
- `.github/workflows/deploy.yml`: `marketing` paths-filter + job (build → deploy
  → optional health check gated on a `MARKETING_URL` repo var).
- Scripts: `pnpm --filter marketing dev` (:4321), root `pnpm deploy:marketing`.
- Present so far: `/` (hero + 3-card teaser), `/privacy`, `/terms` (both stubs),
  `/404`, `robots.txt` (AI crawlers allowed), `favicon.svg`. `og.png` referenced
  by `BaseLayout` but not yet created.

## Domain reshuffle

| host | today | after |
| ---- | ----- | ----- |
| `yourbuddy.golf`, `www.yourbuddy.golf` | `ygb-web` (the app) | **`ygb-marketing`** |
| `app.yourbuddy.golf` | — | **`ygb-web`** (the app) |
| `api.yourbuddy.golf` | `ygb-profile-sync` | unchanged |
| `courses.yourbuddy.golf` | `ygb-course-ls` | unchanged |

Approach: **additive**. In phase 1 `ygb-web` keeps the apex route *and* gains
`app.yourbuddy.golf`, so the app answers on both and nothing breaks. Phase 3
hands the apex to `ygb-marketing` and removes it from `ygb-web`.

Files to change:

- **[phase 1, done]** `apps/web/wrangler.jsonc` — add an `app.yourbuddy.golf`
  route alongside the apex.
- **[phase 1, done]** `CORS_ORIGINS` in `services/profile-sync/wrangler.jsonc` and
  `services/course-ls/wrangler.jsonc` — add `https://app.yourbuddy.golf` (apex
  kept until phase 3).
- **[phase 1, done]** `apps/web/app/layout.tsx` — `metadataBase` →
  `https://app.yourbuddy.golf`.
- **[phase 1, done]** `apps/mobile/app.json` — `expo.extra.webUrl` →
  `https://app.yourbuddy.golf`.
- **[phase 3]** `sites/marketing/wrangler.jsonc` — routes → `yourbuddy.golf` +
  `www.yourbuddy.golf`; remove the apex from `apps/web/wrangler.jsonc`; drop the
  apex from both `CORS_ORIGINS`; move the web deploy health check to `app.`.
- GitHub repo variables `NEXT_PUBLIC_SYNC_ENDPOINT` / `NEXT_PUBLIC_COURSE_LS_ENDPOINT`
  — unchanged (api/courses stay put).

### PWA migration risk

Anyone who installed the PWA from `yourbuddy.golf` has the app shell cached at the
apex. After the switch the apex serves marketing HTML. Mitigation:

1. One final `ygb-web` deploy still on the apex that rewrites `manifest.json`
   `start_url` + `scope` to `https://app.yourbuddy.golf`, so installed apps
   re-anchor on next SW update.
2. The marketing Worker 301s the app's known paths to `app.yourbuddy.golf`
   (`sites/marketing/public/_redirects`, already in place and inert until the
   Worker owns the apex).
3. Then flip the `ygb-web` route to `app.yourbuddy.golf` and the marketing route
   onto the apex — see **Phase 3b** below.

User base is small today, so the exposure is limited but real.

## Page content (SEO + LLM-friendly)

Long single landing page plus thin routes.

- `/` — hero (one `<h1>`, e.g. "Track every round. Keep every note."), app
  screenshot, dual CTA ("Open the app" → `app.yourbuddy.golf`, "Get the Pass" →
  Stripe Payment Link); feature grid; "How it works" (3 steps, mirrors
  `apps/web/app/how-to`); privacy panel ("No account. No email. Your rounds live
  on your device."); pricing ($9 one-time); FAQ.
- `/privacy`, `/terms` — required for Stripe checkout.
- `/welcome` — post-purchase: verifies `session_id`, shows the pass key and how
  to enter it, deep-links into the app.
- `/changelog` — optional, helps SEO freshness.

SEO / LLM specifics:

- Per-page `<title>`, meta description, canonical; OpenGraph + Twitter card image
  (generate once).
- JSON-LD: `SoftwareApplication` + `Offer` (price `9` `USD`), `FAQPage`,
  `Organization`.
- `@astrojs/sitemap` → `sitemap-index.xml`; `robots.txt` allowing all, with
  explicit `GPTBot` / `ClaudeBot` / `PerplexityBot` / `Google-Extended` allows.
- `/llms.txt` (short: what it is, the pages, pricing, privacy stance) and
  `/llms-full.txt` (the full copy).
- Declarative prose models can quote verbatim: "Your Golf Buddy is a free,
  offline-first golf scorecard PWA. A one-time $9 pass adds cloud sync across
  devices. No account, no email."
- Static + one webfont → Lighthouse 100s are realistic.

## The pass — enforcement

1. Stripe Payment Link (product "Golf Buddy Pass", $9, one-time). Success URL
   `https://yourbuddy.golf/welcome?session_id={CHECKOUT_SESSION_ID}`.
2. Marketing Worker route `GET /welcome` (or a small `/api/pass` endpoint):
   - `stripe.checkout.sessions.retrieve(session_id)`; require
     `payment_status === "paid"`.
   - Issue `pass = base64url(payload) + "." + HMAC_SHA256(payload, PASS_SECRET)`
     where payload is `{ iat, kind: "sync" }` (no PII needed). `PASS_SECRET` is a
     Worker secret shared with `profile-sync`.
3. App Settings — a "Golf Buddy Pass" field: paste the key, stored in
   `localStorage` as `golf_buddy_pass`, sent as `X-Golf-Pass: <pass>` on
   `/sync/*` requests (`apps/web/lib/cloud-sync.ts` `authHeaders()`).
4. `services/profile-sync/src/auth.ts` `requireProfile` — after the profile-UUID
   check, verify the `X-Golf-Pass` HMAC; `402 Payment Required` if missing or
   bad. Add `PASS_SECRET` to `worker-env.d.ts` + `wrangler secret put`.
5. Grace: allow existing synced profiles (rows already in D1) to keep syncing
   without a pass, or give the current user (`ptums`) a comped key. Decide before
   flipping the gate.

Keep the existing free "this device only" experience unchanged — the pass only
gates the network sync path.

## Build order

Phases 1–4 do not depend on the payment work and can ship first.

1. **Domain reshuffle** *(config landed; effective on the next successful
   deploy — needs the `Zone · Workers Routes · Edit` token scope to register the
   new custom domain)*. `ygb-web` now routes both the apex and
   `app.yourbuddy.golf`; CORS, `metadataBase`, mobile `webUrl` updated. Verify
   the app + sync + search on `app.yourbuddy.golf` once it deploys.
2. **Scaffold** `sites/marketing` — workspace, deploy job, minimal Astro site.
   *(done — builds, `astro check` clean, wrangler dry-run OK; not yet deployed
   because the token/AE blockers still hold all deploys.)*
3. **Landing page** *(done — content, JSON-LD, `llms.txt` / `llms-full.txt`,
   generated `og.png`, `_redirects`)*. `ygb-marketing` deploys with no routes,
   so it went live at `https://ygb-marketing.<subdomain>.workers.dev` even while
   the routed Workers are blocked. Full site is previewable there now.
4. **`/privacy`, `/terms`, `/welcome`** done. `/welcome` is a static stub
   (`noindex`, out of the sitemap) with activation steps + a manual-key note;
   phase 5 turns it into a Worker route that verifies `?session_id=` and shows
   the issued key inline.
5. **Payment machinery** *(built, dark — see [`pass.md`](pass.md))*. `src/pass.ts`
   (HMAC issue/verify), `POST /pass/claim` on profile-sync (Stripe session →
   pass), `X-Golf-Pass` on the app's sync requests, a Settings field, and the
   `/welcome` claim flow. All behind flags (`PUBLIC_PASS_ENABLED`,
   `NEXT_PUBLIC_PASS_ENABLED`, `PASS_ENABLED`) that are off, so the site still
   reads as a free app. Launch = create the Stripe Payment Link + set secrets +
   flip flags (checklist in `pass.md`).
6. **Flip the sync gate** — `PASS_ENFORCED` in `profile-sync` (after the grace
   decision: grandfather existing profiles, or comp `ptums` a key).

### Phase 3b — the apex cutover (run once, deliberately)

Only after the `Zone · Workers Routes · Edit` token scope is in place and a
normal deploy is green. Do it as one PR:

1. `apps/web/public/manifest.json` — set `start_url` and `scope` to
   `https://app.yourbuddy.golf/` (absolute). Deploy `ygb-web` **first** so
   installed PWAs re-anchor on their next service-worker update.
2. `apps/web/wrangler.jsonc` — remove the `yourbuddy.golf` route (keep only
   `app.yourbuddy.golf`). Deploy `ygb-web` again → the apex custom domain is
   now unclaimed.
3. `sites/marketing/wrangler.jsonc` — add
   `"routes": [{ "pattern": "yourbuddy.golf", "custom_domain": true },
   { "pattern": "www.yourbuddy.golf", "custom_domain": true }]`. Deploy
   `ygb-marketing` → it now serves the apex; `public/_redirects` starts
   forwarding the old app paths.
4. Drop the apex + `www` from `CORS_ORIGINS` in both services once nothing on
   the apex needs the API. Point the web deploy health check at
   `https://app.yourbuddy.golf` (or set the `WEB_URL` repo var).
5. Verify: `yourbuddy.golf` → marketing, `yourbuddy.golf/games` → 301 to
   `app.yourbuddy.golf/games`, app + sync work on `app.yourbuddy.golf`.

Steps 2 and 3 are a brief window where the apex 404s — do them back to back.
