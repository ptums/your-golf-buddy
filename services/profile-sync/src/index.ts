import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import {
  syncPullRequestSchema,
  syncPushRequestSchema,
  syncStateRequestSchema,
} from "@ygb/shared";
import { getDb } from "./db/client.js";
import { checkSyncState } from "./sync/state.js";
import { pushChanges } from "./sync/push.js";
import { pullChanges } from "./sync/pull.js";

const app = new Hono<{ Bindings: Env }>();

app.use("*", async (c, next) => {
  const configured = (c.env.CORS_ORIGINS ?? "*")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = configured.includes("*") ? "*" : configured;
  return cors({
    origin,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    maxAge: 86400,
  })(c, next);
});

app.get("/api/v1/health", (c) => c.json({ ok: true } as const));

app.post(
  "/api/sync/state",
  zValidator("json", syncStateRequestSchema),
  async (c) => {
    const { cursors } = c.req.valid("json");
    return c.json(await checkSyncState(getDb(c.env.DB), cursors));
  },
);

const handlePush = zValidator("json", syncPushRequestSchema);
app.post("/api/sync/push", handlePush, async (c) =>
  c.json(await pushChanges(getDb(c.env.DB), c.req.valid("json"))),
);
// Legacy alias kept for older clients.
app.post("/api/v1/sync", handlePush, async (c) =>
  c.json(await pushChanges(getDb(c.env.DB), c.req.valid("json"))),
);

app.post(
  "/api/sync/pull",
  zValidator("json", syncPullRequestSchema),
  async (c) => c.json(await pullChanges(getDb(c.env.DB), c.req.valid("json"))),
);

app.notFound((c) => c.json({ status: "error", message: "Not found" }, 404));

app.onError((err, c) => {
  console.error("profile-sync error:", err);
  const message = err instanceof Error ? err.message : "Unknown error";
  return c.json({ status: "error", message }, 500);
});

export default app;
