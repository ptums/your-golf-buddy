// Secrets are not part of `wrangler types` output. Declared here and merged
// with the generated `Env` interface.
interface Env {
  /** Google Places API (New) key. Set with `wrangler secret put`. */
  GOOGLE_MAPS_API_KEY?: string;
  /** Comma-separated allowed CORS origins, or "*". From wrangler.jsonc vars. */
  CORS_ORIGINS?: string;
}
