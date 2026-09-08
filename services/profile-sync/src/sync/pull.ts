import { and, asc, gt, isNotNull, or } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import type {
  ServerChanges,
  ServerCourse,
  ServerGame,
  ServerProfile,
  ServerScore,
  SyncPullRequest,
  SyncPullResponse,
} from "@ygb/shared";
import type { Db } from "../db/client.js";
import { courses, games, profiles, scores } from "../db/schema.js";
import { allCursors } from "./cursors.js";

/**
 * Return every row changed (updated or tombstoned) since the client's cursor,
 * ordered by `updated_at`, capped at `limit`. Ported from Laravel
 * `SyncController::pullChanges()` / `getChangesSince()`.
 */
export async function pullChanges(
  db: Db,
  req: SyncPullRequest,
): Promise<SyncPullResponse> {
  const { cursors, limit } = req;

  const [profileRows, courseRows, gameRows, scoreRows] = await Promise.all([
    changedProfiles(db, cursors.profiles ?? null, limit),
    changedCourses(db, cursors.courses ?? null, limit),
    changedGames(db, cursors.games ?? null, limit),
    changedScores(db, cursors.scores ?? null, limit),
  ]);

  const changes: ServerChanges = {
    profiles: profileRows,
    courses: courseRows,
    games: gameRows,
    scores: scoreRows,
  };

  return { changes, serverCursors: await allCursors(db) };
}

function sinceCondition(
  updatedAt: AnySQLiteColumn,
  deletedAt: AnySQLiteColumn,
  cursor: string | null,
) {
  if (!cursor) return undefined;
  return or(
    gt(updatedAt, cursor),
    and(isNotNull(deletedAt), gt(deletedAt, cursor)),
  );
}

async function changedProfiles(
  db: Db,
  cursor: string | null,
  limit: number,
): Promise<ServerProfile[]> {
  const rows = await db
    .select()
    .from(profiles)
    .where(sinceCondition(profiles.updatedAt, profiles.deletedAt, cursor))
    .orderBy(asc(profiles.updatedAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    dob_hash: r.dobHash,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
    deleted_at: r.deletedAt,
  }));
}

async function changedCourses(
  db: Db,
  cursor: string | null,
  limit: number,
): Promise<ServerCourse[]> {
  const rows = await db
    .select()
    .from(courses)
    .where(sinceCondition(courses.updatedAt, courses.deletedAt, cursor))
    .orderBy(asc(courses.updatedAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    profile_id: r.profileId,
    external_id: r.externalId,
    name: r.name,
    rounds: r.rounds,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
    deleted_at: r.deletedAt,
  }));
}

async function changedGames(
  db: Db,
  cursor: string | null,
  limit: number,
): Promise<ServerGame[]> {
  const rows = await db
    .select()
    .from(games)
    .where(sinceCondition(games.updatedAt, games.deletedAt, cursor))
    .orderBy(asc(games.updatedAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    profile_id: r.profileId,
    external_id: r.externalId,
    course_id: r.courseId,
    date: r.date,
    final_note: r.finalNote,
    final_score: r.finalScore,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
    deleted_at: r.deletedAt,
  }));
}

async function changedScores(
  db: Db,
  cursor: string | null,
  limit: number,
): Promise<ServerScore[]> {
  const rows = await db
    .select()
    .from(scores)
    .where(sinceCondition(scores.updatedAt, scores.deletedAt, cursor))
    .orderBy(asc(scores.updatedAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    profile_id: r.profileId,
    external_id: r.externalId,
    game_id: r.gameId,
    hole: r.hole,
    par: r.par,
    score: r.score,
    putts: r.putts,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
    deleted_at: r.deletedAt,
  }));
}
