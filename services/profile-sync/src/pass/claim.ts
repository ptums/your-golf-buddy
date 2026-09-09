import type { Context } from "hono";
import { flagOn, issuePass } from "../pass.js";

/**
 * POST /pass/claim  { sessionId }  ->  { pass }
 *
 * Exchanges a paid Stripe Checkout session for a Golf Buddy Pass. Called by the
 * /welcome page after Stripe redirects the buyer back. Dark until both
 * PASS_ENABLED === "true" and the STRIPE_SECRET_KEY / PASS_SECRET secrets are
 * set — otherwise 404, so the feature simply doesn't exist yet.
 */
export async function claimPass(c: Context<{ Bindings: Env }>): Promise<Response> {
  if (!flagOn(c.env.PASS_ENABLED) || !c.env.STRIPE_SECRET_KEY || !c.env.PASS_SECRET) {
    return c.json({ status: "error", message: "Not found" }, 404);
  }

  const ip = c.req.header("cf-connecting-ip") ?? "0.0.0.0";
  const rl = await c.env.LOG_LIMITER?.limit({ key: `claim:${ip}` });
  if (rl && !rl.success) {
    return c.json({ status: "error", message: "Rate limit exceeded" }, 429);
  }

  const body = (await c.req.json().catch(() => ({}))) as { sessionId?: unknown };
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return c.json({ status: "error", message: "Invalid session" }, 400);
  }

  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
    { headers: { Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}` } },
  );
  if (!res.ok) {
    return c.json({ status: "error", message: "Could not verify payment" }, 502);
  }

  const session = (await res.json()) as {
    payment_status?: string;
    status?: string;
  };
  if (session.payment_status !== "paid") {
    return c.json({ status: "error", message: "Payment not completed" }, 402);
  }

  const pass = await issuePass(c.env.PASS_SECRET, { kind: "sync", sid: sessionId });
  return c.json({ status: "ok", pass });
}
