import { eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { courses, games, profiles, scores } from "../db/schema.js";

export interface SyncDeleteResponse {
  status: "ok";
  deleted: { profiles: number; courses: number; games: number; scores: number };
}

/**
 * "Delete my data" — hard-removes every server row for the caller's profile.
 *
 * The server copy is gone immediately. A device that still holds the data
 * locally will re-push it on its next sync, so a full wipe means turning sync
 * off (or clearing the app) on every device first.
 */
export async function deleteProfileData(
  db: Db,
  profileId: string,
): Promise<SyncDeleteResponse> {
  const s = await db
    .delete(scores)
    .where(eq(scores.profileId, profileId))
    .returning({ id: scores.id });
  const g = await db
    .delete(games)
    .where(eq(games.profileId, profileId))
    .returning({ id: games.id });
  const c = await db
    .delete(courses)
    .where(eq(courses.profileId, profileId))
    .returning({ id: courses.id });
  const p = await db
    .delete(profiles)
    .where(eq(profiles.id, profileId))
    .returning({ id: profiles.id });

  return {
    status: "ok",
    deleted: {
      scores: s.length,
      games: g.length,
      courses: c.length,
      profiles: p.length,
    },
  };
}
