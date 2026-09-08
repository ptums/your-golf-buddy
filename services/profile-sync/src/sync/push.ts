import { eq } from "drizzle-orm";
import type { SyncPushRequest, SyncPushResponse } from "@ygb/shared";
import type { Db } from "../db/client.js";
import { courses, games, profiles, scores } from "../db/schema.js";
import { fallbackHash } from "../lib/hash.js";
import { nowIso } from "../lib/time.js";
import { allCursors } from "./cursors.js";

/**
 * Idempotent upsert of client changes. Ported from the Laravel legacy
 * `SyncController::sync()` — that is the path the live web client actually
 * exercises (`apps/web/lib/cloud-sync.ts` `collectSyncData()` sends raw
 * IndexedDB rows, not pre-normalised ones).
 *
 * For each row:
 *  - `external_id` is derived from the client's local numeric id
 *    (`course:7`, `game:42`, `score:9001`), falling back to a content hash.
 *  - profile ownership for games/scores is resolved course -> profile.
 *  - `deleted_at` is cleared (an upsert un-deletes).
 *
 * Writes are sequential rather than one atomic batch: payloads are tiny
 * (single user) and the client only advances its cursor after a fully
 * successful push, so a partial failure is simply retried.
 */
export async function pushChanges(
  db: Db,
  payload: SyncPushRequest,
): Promise<SyncPushResponse> {
  const now = nowIso();

  const saved = { profiles: 0, courses: 0, games: 0, scores: 0 };

  // --- 1. profiles (client owns the UUID) ---
  for (const p of payload.profiles) {
    await db
      .insert(profiles)
      .values({
        id: p.id,
        username: p.username,
        dobHash: p.dobHash,
        createdAt: p.createdAt ?? now,
        updatedAt: now,
        deletedAt: null,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          username: p.username,
          dobHash: p.dobHash,
          updatedAt: now,
          deletedAt: null,
        },
      });
    saved.profiles++;
  }

  // Preload the whole domain (single-user DB -> a handful of rows) so we can
  // resolve external ids -> UUIDs and reuse existing row ids on conflict.
  const courseByExternal = new Map<string, { id: string; profileId: string }>();
  for (const c of await db.select().from(courses)) {
    courseByExternal.set(c.externalId, { id: c.id, profileId: c.profileId });
  }
  const gameByExternal = new Map<string, { id: string; profileId: string }>();
  for (const g of await db.select().from(games)) {
    gameByExternal.set(g.externalId, { id: g.id, profileId: g.profileId });
  }

  // --- 2. courses ---
  for (const c of payload.courses) {
    const externalId =
      externalIdFor("course", c.id) ??
      `course:${fallbackHash(`${c.name}${c.profileId}`)}`;

    const existing = courseByExternal.get(externalId);
    const id = existing?.id ?? crypto.randomUUID();
    const rounds = Number(c.rounds);

    await db
      .insert(courses)
      .values({
        id,
        profileId: c.profileId,
        externalId,
        name: c.name,
        rounds,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      .onConflictDoUpdate({
        target: [courses.profileId, courses.externalId],
        set: { name: c.name, rounds, updatedAt: now, deletedAt: null },
      });

    courseByExternal.set(externalId, { id, profileId: c.profileId });
    saved.courses++;
  }

  // --- 3. games (owner = owning course's profile) ---
  for (const g of payload.games) {
    if (g.date == null || g.courseId == null) continue;

    const externalId =
      externalIdFor("game", g.id) ??
      `game:${fallbackHash(`${g.finalNote ?? ""}${g.finalScore ?? ""}${g.date}`)}`;

    const courseExternal = `course:${g.courseId}`;
    const course =
      courseByExternal.get(courseExternal) ??
      (await lookupCourse(db, courseExternal));
    if (!course) continue; // unknown course -> skip, client will retry

    const existing = gameByExternal.get(externalId);
    const id = existing?.id ?? crypto.randomUUID();
    const finalScore =
      g.finalScore == null ? null : Number(g.finalScore);

    await db
      .insert(games)
      .values({
        id,
        profileId: course.profileId,
        externalId,
        courseId: course.id,
        date: g.date,
        finalNote: g.finalNote ?? null,
        finalScore,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      .onConflictDoUpdate({
        target: [games.profileId, games.externalId],
        set: {
          courseId: course.id,
          date: g.date,
          finalNote: g.finalNote ?? null,
          finalScore,
          updatedAt: now,
          deletedAt: null,
        },
      });

    gameByExternal.set(externalId, { id, profileId: course.profileId });
    saved.games++;
  }

  // --- 4. scores (owner = owning game's profile) ---
  for (const s of payload.scores) {
    if (
      s.gameId == null ||
      s.hole == null ||
      s.par == null ||
      s.score == null ||
      s.putts == null
    ) {
      continue;
    }

    const externalId =
      externalIdFor("score", s.id) ??
      `score:${fallbackHash(
        `${s.gameId}|${s.hole}|${s.par}|${s.score}|${s.putts}`,
      )}`;

    const gameExternal = `game:${s.gameId}`;
    const game =
      gameByExternal.get(gameExternal) ??
      (await lookupGame(db, gameExternal));
    if (!game) continue;

    await db
      .insert(scores)
      .values({
        id: crypto.randomUUID(),
        profileId: game.profileId,
        externalId,
        gameId: game.id,
        hole: Number(s.hole),
        par: String(s.par),
        score: String(s.score),
        putts: Number(s.putts),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      .onConflictDoUpdate({
        target: [scores.profileId, scores.externalId],
        set: {
          gameId: game.id,
          hole: Number(s.hole),
          par: String(s.par),
          score: String(s.score),
          putts: Number(s.putts),
          updatedAt: now,
          deletedAt: null,
        },
      });

    saved.scores++;
  }

  return {
    status: "ok",
    saved,
    serverCursors: await allCursors(db),
  };
}

function externalIdFor(
  prefix: "course" | "game" | "score",
  id: number | string | undefined,
): string | null {
  if (id === undefined || id === null || id === "") return null;
  return `${prefix}:${id}`;
}

async function lookupCourse(db: Db, externalId: string) {
  const row = await db
    .select({ id: courses.id, profileId: courses.profileId })
    .from(courses)
    .where(eq(courses.externalId, externalId));
  return row[0] ?? null;
}

async function lookupGame(db: Db, externalId: string) {
  const row = await db
    .select({ id: games.id, profileId: games.profileId })
    .from(games)
    .where(eq(games.externalId, externalId));
  return row[0] ?? null;
}
