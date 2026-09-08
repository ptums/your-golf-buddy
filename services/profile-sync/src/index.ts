import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import {
  syncPullRequestSchema,
  syncPushRequestSchema,
  syncStateRequestSchema,
} from "@ygb/shared";
import { requireProfile, type AuthedEnv } from "./auth.js";
import { getDb } from "./db/client.js";
import { checkSyncState } from "./sync/state.js";
import { pushChanges } from "./sync/push.js";
import { pullChanges } from "./sync/pull.js";
import { deleteProfileData } from "./sync/delete.js";

const routes = new Hono<AuthedEnv>();

// Every /sync/* route is scoped to the caller's profile (their capability token).
routes.use("/sync/*", requireProfile);
routes.use("/v1/sync", requireProfile);

routes.get("/v1/health", (c) => c.json({ ok: true } as const));

routes.post(
  "/sync/state",
  zValidator("json", syncStateRequestSchema),
  async (c) => {
    const { cursors } = c.req.valid("json");
    return c.json(
      await checkSyncState(getDb(c.env.DB), c.get("profileId"), cursors),
    );
  },
);

const handlePush = zValidator("json", syncPushRequestSchema);
routes.post("/sync/push", handlePush, async (c) =>
  c.json(
    await pushChanges(getDb(c.env.DB), c.get("profileId"), c.req.valid("json")),
  ),
);
routes.post("/v1/sync", handlePush, async (c) =>
  c.json(
    await pushChanges(getDb(c.env.DB), c.get("profileId"), c.req.valid("json")),
  ),
); // legacy alias

routes.post(
  "/sync/pull",
  zValidator("json", syncPullRequestSchema),
  async (c) =>
    c.json(
      await pullChanges(getDb(c.env.DB), c.get("profileId"), c.req.valid("json")),
    ),
);

routes.post("/sync/delete", async (c) =>
  c.json(await deleteProfileData(getDb(c.env.DB), c.get("profileId"))),
);

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
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })(c, next);
});

// The documented base path is `/api`; also serve at the root so a client
// endpoint that omits `/api` still works.
app.route("/api", routes);
app.route("/", routes);

app.notFound((c) => c.json({ status: "error", message: "Not found" }, 404));

app.onError((err, c) => {
  console.error("profile-sync error:", err);
  const message = err instanceof Error ? err.message : "Unknown error";
  return c.json({ status: "error", message }, 500);
});

export default app;
