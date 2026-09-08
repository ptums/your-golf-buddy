import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type {
  SyncPullResponse,
  SyncPushResponse,
  SyncStateResponse,
} from "@ygb/shared";
import worker, { app } from "../src/index";

const PROFILE_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_ID = "22222222-2222-2222-2222-222222222222";

const sampleFor = (profileId: string) => ({
  profiles: [
    {
      id: profileId,
      username: `u-${profileId.slice(0, 8)}`,
      dobHash: "abc123",
      createdAt: "2025-08-01T00:00:00.000Z",
      lastActiveAt: "2025-09-01T00:00:00.000Z",
    },
  ],
  courses: [{ id: 7, name: "Ozark Links", rounds: 18, profileId }],
  games: [
    {
      id: 42,
      date: "2025-09-05T14:00:00.000Z",
      courseId: 7,
      finalNote: "windy",
      finalScore: 88,
    },
  ],
  scores: [{ id: 9001, gameId: 42, hole: 1, par: "4", score: "5", putts: 2 }],
  metadata: { deviceId: "device-xyz", version: "1.0.0" },
});

const samplePayload = sampleFor(PROFILE_ID);

function post(path: string, body: unknown, token: string | null = PROFILE_ID) {
  return app.request(
    path,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    },
    env,
  );
}

describe("profile-sync", () => {
  it("GET /api/v1/health needs no auth", async () => {
    const res = await app.request("/api/v1/health", {}, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("rejects sync requests without a bearer token", async () => {
    const res = await post("/api/sync/state", { cursors: {} }, null);
    expect(res.status).toBe(401);
  });

  it("rejects a malformed bearer token", async () => {
    const res = await post("/api/sync/state", { cursors: {} }, "not-a-uuid");
    expect(res.status).toBe(401);
  });

  it("serves the same routes with and without the /api prefix", async () => {
    for (const path of ["/api/v1/health", "/v1/health"]) {
      expect((await app.request(path, {}, env)).status).toBe(200);
    }
    for (const path of ["/api/sync/state", "/sync/state"]) {
      expect((await post(path, { cursors: {} })).status).toBe(200);
    }
  });

  it("state is in sync when both sides are empty", async () => {
    const res = await post("/api/sync/state", { cursors: {} });
    expect(res.status).toBe(200);
    expect(await res.json<SyncStateResponse>()).toEqual({ inSync: true });
  });

  it("push then pull round-trips the sample payload with linked ids", async () => {
    const push = await (
      await post("/api/sync/push", samplePayload)
    ).json<SyncPushResponse>();
    expect(push.saved).toEqual({ profiles: 1, courses: 1, games: 1, scores: 1 });

    const state = await (
      await post("/api/sync/state", { cursors: {} })
    ).json<SyncStateResponse>();
    expect(state.inSync).toBe(false);
    expect(state.counts).toEqual({
      profiles: 1,
      courses: 1,
      games: 1,
      scores: 1,
    });

    const pull = await (
      await post("/api/sync/pull", { cursors: {}, limit: 100 })
    ).json<SyncPullResponse>();

    expect(pull.changes.profiles[0]).toMatchObject({
      id: PROFILE_ID,
      username: "u-11111111",
      deleted_at: null,
    });

    const course = pull.changes.courses[0]!;
    const game = pull.changes.games[0]!;
    const score = pull.changes.scores[0]!;

    expect(course).toMatchObject({ external_id: "course:7", name: "Ozark Links" });
    expect(game).toMatchObject({
      external_id: "game:42",
      course_id: course.id,
      course_external_id: "course:7",
      final_score: 88,
    });
    expect(score).toMatchObject({
      external_id: "score:9001",
      game_id: game.id,
      game_external_id: "game:42",
      putts: 2,
    });

    const second = await (
      await post("/api/sync/pull", { cursors: pull.serverCursors, limit: 100 })
    ).json<SyncPullResponse>();
    expect(second.changes.courses).toHaveLength(0);
  });

  it("isolates profiles — one token never sees another's rows", async () => {
    await post("/api/sync/push", sampleFor(PROFILE_ID), PROFILE_ID);
    await post("/api/sync/push", sampleFor(OTHER_ID), OTHER_ID);

    const mine = await (
      await post("/api/sync/pull", { cursors: {}, limit: 100 }, PROFILE_ID)
    ).json<SyncPullResponse>();
    expect(mine.changes.profiles).toHaveLength(1);
    expect(mine.changes.profiles[0]!.id).toBe(PROFILE_ID);
    expect(mine.changes.courses.every((c) => c.profile_id === PROFILE_ID)).toBe(
      true,
    );

    const state = await (
      await post("/api/sync/state", { cursors: {} }, PROFILE_ID)
    ).json<SyncStateResponse>();
    // counts are per-profile, not the whole table
    expect(state.counts).toEqual({
      profiles: 1,
      courses: 1,
      games: 1,
      scores: 1,
    });
  });

  it("push ignores rows belonging to another profile", async () => {
    const mixed = {
      ...sampleFor(PROFILE_ID),
      courses: [
        { id: 7, name: "Mine", rounds: 18, profileId: PROFILE_ID },
        { id: 8, name: "Theirs", rounds: 9, profileId: OTHER_ID },
      ],
      profiles: [
        { id: PROFILE_ID, username: "mine", dobHash: "h" },
        { id: OTHER_ID, username: "spoof", dobHash: "h" },
      ],
    };
    const push = await (
      await post("/api/sync/push", mixed, PROFILE_ID)
    ).json<SyncPushResponse>();
    expect(push.saved.courses).toBe(1);
    expect(push.saved.profiles).toBe(1);
  });

  it("delete removes every row for the caller's profile", async () => {
    await post("/api/sync/push", sampleFor(PROFILE_ID), PROFILE_ID);
    await post("/api/sync/push", sampleFor(OTHER_ID), OTHER_ID);

    const del = await (
      await post("/api/sync/delete", {}, PROFILE_ID)
    ).json<{ status: string; deleted: Record<string, number> }>();
    expect(del.status).toBe("ok");
    expect(del.deleted).toEqual({
      profiles: 1,
      courses: 1,
      games: 1,
      scores: 1,
    });

    const gone = await (
      await post("/api/sync/pull", { cursors: {}, limit: 100 }, PROFILE_ID)
    ).json<SyncPullResponse>();
    expect(gone.changes.profiles).toHaveLength(0);
    expect(gone.changes.courses).toHaveLength(0);

    // the other profile is untouched
    const other = await (
      await post("/api/sync/pull", { cursors: {}, limit: 100 }, OTHER_ID)
    ).json<SyncPullResponse>();
    expect(other.changes.courses).toHaveLength(1);
  });

  it("legacy /api/v1/sync alias also accepts a push", async () => {
    const res = await post("/api/v1/sync", samplePayload);
    expect(res.status).toBe(200);
    expect((await res.json<SyncPushResponse>()).status).toBe("ok");
  });

  describe("POST /log", () => {
    const log = (body: unknown) =>
      app.request(
        "/log",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
        env,
      );

    it("accepts a client error without auth and returns 204", async () => {
      const res = await log({ message: "boom", stack: "at x", level: "error" });
      expect(res.status).toBe(204);
    });

    it("returns 204 and drops a payload with no message", async () => {
      expect((await log({ level: "warn" })).status).toBe(204);
    });

    it("is also mounted under /api", async () => {
      const res = await app.request(
        "/api/log",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: "via api" }),
        },
        env,
      );
      expect(res.status).toBe(204);
    });
  });

  it("scheduled() writes a nightly D1 dump to R2", async () => {
    await post("/api/sync/push", sampleFor(PROFILE_ID), PROFILE_ID);

    const ctx = createExecutionContext();
    await worker.scheduled(
      { scheduledTime: Date.now(), cron: "17 3 * * *", noRetry() {} },
      env,
      ctx,
    );
    await waitOnExecutionContext(ctx);

    const listed = await env.BACKUPS.list({ prefix: "d1/" });
    expect(listed.objects.length).toBeGreaterThan(0);

    const body = await env.BACKUPS.get(listed.objects[0]!.key);
    const dump = (await body!.json()) as {
      counts: Record<string, number>;
      tables: { courses: unknown[] };
    };
    expect(dump.counts.profiles).toBeGreaterThan(0);
    expect(dump.tables.courses.length).toBe(dump.counts.courses);
  });
});
