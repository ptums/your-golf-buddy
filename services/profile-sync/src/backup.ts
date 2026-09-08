import type { Db } from "./db/client.js";
import { courses, games, profiles, scores } from "./db/schema.js";

const RETAIN_DAYS = 30;

/**
 * Dump every table to R2 as one JSON object, then prune backups older than
 * RETAIN_DAYS. Called from the cron trigger. Restore with a small script that
 * reads the file and re-inserts (or via `wrangler d1 execute --file`).
 */
export async function runBackup(db: Db, r2: R2Bucket): Promise<string> {
  const [p, c, g, s] = await Promise.all([
    db.select().from(profiles),
    db.select().from(courses),
    db.select().from(games),
    db.select().from(scores),
  ]);

  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const key = `d1/${now.toISOString().slice(0, 10)}/${stamp}.json`;

  await r2.put(
    key,
    JSON.stringify({
      takenAt: now.toISOString(),
      counts: {
        profiles: p.length,
        courses: c.length,
        games: g.length,
        scores: s.length,
      },
      tables: { profiles: p, courses: c, games: g, scores: s },
    }),
    { httpMetadata: { contentType: "application/json" } },
  );

  const cutoff = new Date(now.getTime() - RETAIN_DAYS * 86_400_000);
  const listed = await r2.list({ prefix: "d1/" });
  await Promise.all(
    listed.objects
      .filter((o) => o.uploaded < cutoff)
      .map((o) => r2.delete(o.key)),
  );

  return key;
}
