# Golf Buddy Pass

A one-time **$9** purchase that unlocks cloud sync. No accounts — the buyer gets
a signed `pass` string and pastes it into the app's Settings; `profile-sync`
verifies it on every `/sync/*` request.

**Everything below is built and merged but dark.** Three independent flags gate
it so it can be turned on in stages. Nothing changes for existing users until
you flip them.

## The flags

| Flag | Where | Off (default) | On |
| ---- | ----- | ------------- | -- |
| `PUBLIC_PASS_ENABLED` | marketing build env | site reads as a free app — no pricing, no buy CTA, no pass FAQ, no `Offer` in JSON-LD | pricing section, "Get the Pass" buttons, `/welcome` claim flow, pass FAQ all appear |
| `NEXT_PUBLIC_PASS_ENABLED` | web build env | no "Golf Buddy Pass" field in Settings | field appears; key saved to `localStorage.golf_buddy_pass`, sent as `X-Golf-Pass` |
| `PASS_ENFORCED` | `services/profile-sync` var | `/sync/*` works for everyone (current behaviour) | `/sync/*` returns `402` without a valid `X-Golf-Pass` |

Plus `PASS_ENABLED` (a `profile-sync` var) — gates `POST /pass/claim`. Keep it in
step with `PUBLIC_PASS_ENABLED`.

The app always sends `X-Golf-Pass` when the user has entered one, and always
reads the field only when `NEXT_PUBLIC_PASS_ENABLED` — so a pass entered early is
harmless and a pass is never *required* until `PASS_ENFORCED`.

## How a purchase becomes a working pass

1. Marketing "Get the Pass" → **Stripe Payment Link** (`PUBLIC_STRIPE_PAYMENT_LINK`).
2. Stripe success URL → `https://yourbuddy.golf/welcome?session_id={CHECKOUT_SESSION_ID}`.
3. `/welcome` client script → `POST {API_URL}/pass/claim { sessionId }`.
4. `services/profile-sync` `POST /pass/claim` (`src/pass/claim.ts`):
   - 404 unless `PASS_ENABLED` + `STRIPE_SECRET_KEY` + `PASS_SECRET` are all set.
   - `GET https://api.stripe.com/v1/checkout/sessions/{id}` with the secret key.
   - requires `payment_status === "paid"`.
   - `issuePass(PASS_SECRET, { kind: "sync", sid })` → `{ pass }`.
5. Buyer pastes the pass into **app → Settings → Golf Buddy Pass**.
6. App sends `X-Golf-Pass: <pass>` on `/sync/*`. Once `PASS_ENFORCED` is on,
   `requireProfile` (`src/auth.ts`) calls `verifyPass` and 402s if it's missing
   or bad.

`pass` format: `base64url(JSON payload).base64url(HMAC-SHA256(payload, PASS_SECRET))`.
Payload is `{ iat, kind: "sync", sid? }` — no personal data. `src/pass.ts`.

## Launch checklist

### 1. Stripe (you, in the Stripe dashboard)

- [ ] Create a product "Golf Buddy Pass", one-time price $9.
- [ ] Create a **Payment Link** for it. Set the success URL to
      `https://yourbuddy.golf/welcome?session_id={CHECKOUT_SESSION_ID}`.
- [ ] Copy the Payment Link URL and a **restricted key** with read access to
      *Checkout Sessions* (`rk_live_…`).

### 2. profile-sync secrets + flag

```bash
# a strong random string, shared only with this service
pnpm --filter profile-sync exec wrangler secret put PASS_SECRET
pnpm --filter profile-sync exec wrangler secret put STRIPE_SECRET_KEY   # the rk_live_ key
```

- [ ] `services/profile-sync/wrangler.jsonc` → set `"PASS_ENABLED": "true"`.
      Leave `PASS_ENFORCED` at `"false"` for now.
- [ ] `pnpm --filter profile-sync cf-typegen` (regenerates the literal types),
      then deploy.

### 3. Build env for the two front ends

Set as GitHub repo **variables** (they're build-time, inlined):

- [ ] `PUBLIC_PASS_ENABLED = true` — used by the marketing build.
- [ ] `PUBLIC_STRIPE_PAYMENT_LINK = https://buy.stripe.com/…`
- [ ] `NEXT_PUBLIC_PASS_ENABLED = true` — used by the web build.

Then wire them into the workflow (`.github/workflows/deploy.yml`): add the two
`PUBLIC_*` to the `marketing` job's build step env, and `NEXT_PUBLIC_PASS_ENABLED`
to the `web` job's build step env.

- [ ] Redeploy `marketing` and `web`.

### 4. Verify (still not enforced)

- [ ] `yourbuddy.golf` shows pricing + "Get the Pass".
- [ ] Buy one (use a Stripe test-mode link first). `/welcome` shows a real key.
- [ ] Paste it into the app → Settings → save. Sync still works (nothing to
      break yet).
- [ ] `curl -X POST $API/pass/claim -d '{"sessionId":"cs_test_…"}'` returns the pass.

### 5. Flip enforcement — the point of no return for free sync

Decide the grace policy first (**open question**): grandfather every profile that
already has rows in D1, or just comp your own `ptums` profile a key?

- If comping only: `issuePass` a key for yourself locally and enter it.
- If grandfathering: add a check in `requireProfile` that skips the 402 when the
  profile already exists in `profiles` (one extra `SELECT` — or backfill a
  `has_pass` column).

- [ ] `services/profile-sync/wrangler.jsonc` → `"PASS_ENFORCED": "true"`, cf-typegen, deploy.
- [ ] Confirm a profile with no pass gets `402` on `/sync/push`; a profile with a
      valid pass still syncs.

## Rollback

Set any flag back to `"false"` / unset the repo var and redeploy. Passes already
issued stay valid; enforcement just stops.
