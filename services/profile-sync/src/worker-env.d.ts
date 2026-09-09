// Secrets that aren't in wrangler.jsonc, so `wrangler types` never sees them.
// Set with `wrangler secret put <NAME>` (or a local .dev.vars). All optional —
// the Golf Buddy Pass feature is dark until they exist. See docs/pass.md.
interface Env {
  /** Stripe restricted/secret key, read-only on Checkout Sessions. */
  STRIPE_SECRET_KEY?: string;
  /** HMAC secret shared with the pass issuer. */
  PASS_SECRET?: string;
}
