import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type {
  SyncPullResponse,
  SyncPushResponse,
  SyncStateResponse,
} from "@ygb/shared";
import app from "../src/index";

const PROFILE_ID = "11111111-1111-1111-1111-111111111111";

const samplePayload = {
  profiles: [
    {
      id: PROFILE_ID,
      username: "peter",
      dobHash: "abc123",
      createdAt: "2025-08-01T00:00:00.000Z",
      lastActiveAt: "2025-09-01T00:00:00.000Z",
    },
  ],
  courses: [
    { id: 7, name: "Ozark Links", rounds: 18, profileId: PROFILE_ID },
  ],
  games: [
    {
      id: 42,
      date: "2025-09-05T14:00:00.000Z",
      courseId: 7,
      finalNote: "windy",
      finalScore: 88,
    },
  ],
  scores: [
    { id: 9001, gameId: 42, hole: 1, par: "4", score: "5", putts: 2 },
  ],
  metadata: { deviceId: "device-xyz", version: "1.0.0" },
};

function post(path: string, body: unknown) {
  return app.request(
    path,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
    env,
  );
}

describe("profile-sync", () => {
  it("GET /api/v1/health", async () => {
    const res = await app.request("/api/v1/health", {}, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("serves the same routes with and without the /api prefix", async () => {
    for (const path of ["/api/v1/health", "/v1/health"]) {
      const res = await app.request(path, {}, env);
      expect(res.status).toBe(200);
    }
    for (const path of ["/api/sync/state", "/sync/state"]) {
      const res = await post(path, { cursors: {} });
      expect(res.status).toBe(200);
    }
  });

  it("state is in sync when both sides are empty", async () => {
    const res = await post("/api/sync/state", { cursors: {} });
    expect(res.status).toBe(200);
    expect(await res.json<SyncStateResponse>()).toEqual({ inSync: true });
  });

  it("push then pull round-trips the sample payload with linked ids", async () => {
    const pushRes = await post("/api/sync/push", samplePayload);
    expect(pushRes.status).toBe(200);
    const push = await pushRes.json<SyncPushResponse>();
    expect(push.status).toBe("ok");
    expect(push.saved).toEqual({
      profiles: 1,
      courses: 1,
      games: 1,
      scores: 1,
    });

    // Client with stale cursors is now out of sync.
    const stateRes = await post("/api/sync/state", { cursors: {} });
    const state = await stateRes.json<SyncStateResponse>();
    expect(state.inSync).toBe(false);
    expect(state.counts).toEqual({
      profiles: 1,
      courses: 1,
      games: 1,
      scores: 1,
    });

    const pullRes = await post("/api/sync/pull", { cursors: {}, limit: 100 });
    const pull = await pullRes.json<SyncPullResponse>();

    expect(pull.changes.profiles).toHaveLength(1);
    expect(pull.changes.profiles[0]).toMatchObject({
      id: PROFILE_ID,
      username: "peter",
      dob_hash: "abc123",
      deleted_at: null,
    });

    const course = pull.changes.courses[0]!;
    const game = pull.changes.games[0]!;
    const score = pull.changes.scores[0]!;

    expect(course).toMatchObject({
      profile_id: PROFILE_ID,
      external_id: "course:7",
      name: "Ozark Links",
      rounds: 18,
    });
    expect(game).toMatchObject({
      profile_id: PROFILE_ID,
      external_id: "game:42",
      course_id: course.id,
      course_external_id: "course:7",
      final_note: "windy",
      final_score: 88,
    });
    expect(score).toMatchObject({
      profile_id: PROFILE_ID,
      external_id: "score:9001",
      game_id: game.id,
      game_external_id: "game:42",
      hole: 1,
      par: "4",
      score: "5",
      putts: 2,
    });

    // Pulling again with the returned cursors yields nothing new.
    const secondPull = await post("/api/sync/pull", {
      cursors: pull.serverCursors,
      limit: 100,
    });
    const second = await secondPull.json<SyncPullResponse>();
    expect(second.changes.profiles).toHaveLength(0);
    expect(second.changes.courses).toHaveLength(0);
    expect(second.changes.games).toHaveLength(0);
    expect(second.changes.scores).toHaveLength(0);
  });

  it("push is idempotent", async () => {
    await post("/api/sync/push", samplePayload);
    const again = await post("/api/sync/push", samplePayload);
    expect((await again.json<SyncPushResponse>()).saved.courses).toBe(1);

    const pull = await post("/api/sync/pull", { cursors: {}, limit: 100 });
    const body = await pull.json<SyncPullResponse>();
    expect(body.changes.courses).toHaveLength(1);
    expect(body.changes.scores).toHaveLength(1);
  });

  it("legacy /api/v1/sync alias also accepts a push", async () => {
    const res = await post("/api/v1/sync", samplePayload);
    expect(res.status).toBe(200);
    expect((await res.json<SyncPushResponse>()).status).toBe("ok");
  });
});
