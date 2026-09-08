import { sql } from "drizzle-orm";
import type { SyncCounts, SyncCursors } from "@ygb/shared";
import type { Db } from "../db/client.js";
import { tableMap, type SyncTableName } from "../db/schema.js";

/**
 * High-water-mark cursor for a table: the greater of `max(updated_at)` and
 * `max(deleted_at)`, as an ISO-8601 string (or null when the table is empty).
 * Ported from the Laravel `maxCursorFor()`.
 */
export async function maxCursor(
  db: Db,
  table: SyncTableName,
): Promise<string | null> {
  const t = tableMap[table];
  const rows = await db
    .select({
      maxUpdated: sql<string | null>`max(${t.updatedAt})`,
      maxDeleted: sql<string | null>`max(${t.deletedAt})`,
    })
    .from(t);
  const row = rows[0];
  const candidates = [row?.maxUpdated, row?.maxDeleted].filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  if (candidates.length === 0) return null;
  return candidates.sort()[candidates.length - 1] ?? null;
}

export async function allCursors(db: Db): Promise<SyncCursors> {
  const [profiles, courses, games, scores] = await Promise.all([
    maxCursor(db, "profiles"),
    maxCursor(db, "courses"),
    maxCursor(db, "games"),
    maxCursor(db, "scores"),
  ]);
  return { profiles, courses, games, scores };
}

export async function countAll(db: Db): Promise<SyncCounts> {
  const count = async (table: SyncTableName): Promise<number> => {
    const rows = await db
      .select({ n: sql<number>`count(*)` })
      .from(tableMap[table]);
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
