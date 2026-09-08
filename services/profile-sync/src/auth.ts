import type { Context, Next } from "hono";

/**
 * Capability-token auth. The profile's client-generated UUID *is* the
 * credential: it carries 122 bits of entropy, so knowing it is the only way to
 * touch that profile's rows. No accounts, matching the app's anonymous model.
 *
 * Every /sync/* request must send `Authorization: Bearer <profileId>`. The
 * handlers then scope all reads and writes to `c.get("profileId")`.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AuthedEnv = {
  Bindings: Env;
  Variables: { profileId: string };
};

export function bearerProfileId(c: Context): string | null {
  const header = c.req.header("Authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token && UUID_RE.test(token) ? token.toLowerCase() : null;
}

export async function requireProfile(
  c: Context<AuthedEnv>,
  next: Next,
): Promise<Response | void> {
  const profileId = bearerProfileId(c);
  if (!profileId) {
    return c.json(
      { status: "error", message: "Missing or malformed Authorization bearer token" },
      401,
    );
  }

  // Coarse abuse limiter, keyed by the token. Absent binding (tests, local) = allow.
  const limiter = c.env.SYNC_LIMITER;
  if (limiter) {
    const { success } = await limiter.limit({ key: `sync:${profileId}` });
    if (!success) {
      return c.json({ status: "error", message: "Rate limit exceeded" }, 429);
    }
  }

  c.set("profileId", profileId);
  await next();
}
