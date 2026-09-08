import { and, eq } from "drizzle-orm";
import type { SyncPushRequest, SyncPushResponse } from "@ygb/shared";
import type { Db } from "../db/client.js";
import { courses, games, profiles, scores } from "../db/schema.js";
import { fallbackHash } from "../lib/hash.js";
import { nowIso } from "../lib/time.js";
import { allCursors } from "./cursors.js";

/**
 * Idempotent upsert of one profile's changes. Ported from the Laravel legacy
 * `SyncController::sync()` — the path the live web client exercises
 * (`apps/web/lib/cloud-sync.ts` `collectSyncData()` sends raw IndexedDB rows).
 *
 * Everything is scoped to `profileId` (the caller's capability token): rows in
 * the payload for any other profile are ignored.
 *
 * For each row:
 *  - `external_id` is derived from the client's local numeric id
 *    (`course:7`, `game:42`, `score:9001`), falling back to a content hash.
 *  - `deleted_at` is cleared (an upsert un-deletes).
 *
 * Writes are sequential rather than one atomic batch: payloads are tiny and the
 * client only advances its cursor after a fully successful push.
 */
export async function pushChanges(
  db: Db,
  profileId: string,
  payload: SyncPushRequest,
): Promise<SyncPushResponse> {
  const now = nowIso();
  const saved = { profiles: 0, courses: 0, games: 0, scores: 0 };

  // --- 1. profile (only the caller's own) ---
  for (const p of payload.profiles) {
    if (p.id !== profileId) continue;
    await db
      .insert(profiles)
      .values({
        id: profileId,
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

  // Preload this profile's courses/games so we can resolve external ids -> UUIDs
  // and reuse existing row ids on conflict.
  const courseByExternal = new Map<string, string>();
  for (const c of await db
    .select()
    .from(courses)
    .where(eq(courses.profileId, profileId))) {
    courseByExternal.set(c.externalId, c.id);
  }
  const gameByExternal = new Map<string, string>();
  for (const g of await db
    .select()
    .from(games)
    .where(eq(games.profileId, profileId))) {
    gameByExternal.set(g.externalId, g.id);
  }

  // --- 2. courses ---
  for (const c of payload.courses) {
    if (c.profileId !== profileId) continue;

    const externalId =
      externalIdFor("course", c.id) ??
      `course:${fallbackHash(`${c.name}${profileId}`)}`;

    const id = courseByExternal.get(externalId) ?? crypto.randomUUID();
    const rounds = Number(c.rounds);

    await db
      .insert(courses)
      .values({
        id,
        profileId,
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

    courseByExternal.set(externalId, id);
    saved.courses++;
  }

  // --- 3. games (must belong to one of this profile's courses) ---
  for (const g of payload.games) {
    if (g.date == null || g.courseId == null) continue;

    const externalId =
      externalIdFor("game", g.id) ??
      `game:${fallbackHash(`${g.finalNote ?? ""}${g.finalScore ?? ""}${g.date}`)}`;

    const courseId =
      courseByExternal.get(`course:${g.courseId}`) ??
      (await lookupOwnedId(db, courses, profileId, `course:${g.courseId}`));
    if (!courseId) continue; // unknown course -> skip, client will retry

    const id = gameByExternal.get(externalId) ?? crypto.randomUUID();
    const finalScore = g.finalScore == null ? null : Number(g.finalScore);

    await db
      .insert(games)
      .values({
        id,
        profileId,
        externalId,
        courseId,
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
          courseId,
          date: g.date,
          finalNote: g.finalNote ?? null,
          finalScore,
          updatedAt: now,
          deletedAt: null,
        },
      });

    gameByExternal.set(externalId, id);
    saved.games++;
  }

  // --- 4. scores (must belong to one of this profile's games) ---
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

    const gameId =
      gameByExternal.get(`game:${s.gameId}`) ??
      (await lookupOwnedId(db, games, profileId, `game:${s.gameId}`));
    if (!gameId) continue;

    await db
      .insert(scores)
      .values({
        id: crypto.randomUUID(),
        profileId,
        externalId,
        gameId,
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
          gameId,
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
    serverCursors: await allCursors(db, profileId),
  };
}

function externalIdFor(
  prefix: "course" | "game" | "score",
  id: number | string | undefined,
): string | null {
  if (id === undefined || id === null || id === "") return null;
  return `${prefix}:${id}`;
}

async function lookupOwnedId(
  db: Db,
  table: typeof courses | typeof games,
  profileId: string,
  externalId: string,
): Promise<string | null> {
  const row = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.profileId, profileId), eq(table.externalId, externalId)));
  return row[0]?.id ?? null;
}
