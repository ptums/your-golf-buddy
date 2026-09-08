import { eq, sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import type { SyncCounts, SyncCursors } from "@ygb/shared";
import type { Db } from "../db/client.js";
import { courses, games, profiles, scores } from "../db/schema.js";
import { tableMap, type SyncTableName } from "../db/schema.js";

/** Column that holds the owning profile id for a table. */
function ownerColumn(table: SyncTableName): AnySQLiteColumn {
  switch (table) {
    case "profiles":
      return profiles.id;
    case "courses":
      return courses.profileId;
    case "games":
      return games.profileId;
    case "scores":
      return scores.profileId;
  }
}

/**
 * High-water-mark cursor for one profile's rows in a table: the greater of
 * `max(updated_at)` and `max(deleted_at)`, ISO-8601 (or null when there are
 * none). Ported from the Laravel `maxCursorFor()`.
 */
export async function maxCursor(
  db: Db,
  table: SyncTableName,
  profileId: string,
): Promise<string | null> {
  const t = tableMap[table];
  const rows = await db
    .select({
      maxUpdated: sql<string | null>`max(${t.updatedAt})`,
      maxDeleted: sql<string | null>`max(${t.deletedAt})`,
    })
    .from(t)
    .where(eq(ownerColumn(table), profileId));
  const row = rows[0];
  const candidates = [row?.maxUpdated, row?.maxDeleted].filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  if (candidates.length === 0) return null;
  return candidates.sort()[candidates.length - 1] ?? null;
}

export async function allCursors(
  db: Db,
  profileId: string,
): Promise<SyncCursors> {
  const [profiles, courses, games, scores] = await Promise.all([
    maxCursor(db, "profiles", profileId),
    maxCursor(db, "courses", profileId),
    maxCursor(db, "games", profileId),
    maxCursor(db, "scores", profileId),
  ]);
  return { profiles, courses, games, scores };
}

export async function countAll(
  db: Db,
  profileId: string,
): Promise<SyncCounts> {
  const count = async (table: SyncTableName): Promise<number> => {
    const rows = await db
      .select({ n: sql<number>`count(*)` })
      .from(tableMap[table])
      .where(eq(ownerColumn(table), profileId));
    return rows[0]?.n ?? 0;
  };
  const [profiles, courses, games, scores] = await Promise.all([
    count("profiles"),
    count("courses"),
    count("games"),
    count("scores"),
  ]);
  return { profiles, courses, games, scores };
}
