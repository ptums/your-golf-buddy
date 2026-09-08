// Secrets are not part of `wrangler types` output. Declared here and merged
// with the generated `Env` interface.
interface Env {
  /** Google Places API (New) key. Set with `wrangler secret put`. */
  GOOGLE_MAPS_API_KEY?: string;
}
