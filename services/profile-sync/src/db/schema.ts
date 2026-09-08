/**
 * Drizzle schema for the profile-sync D1 database.
 *
 * Ported 1:1 from the previous Laravel migrations
 * (profile-sync/database/migrations/2025_09_06_*). Every domain table shares:
 *   id          TEXT  primary key (app-generated UUID)
 *   created_at  TEXT  ISO-8601
 *   updated_at  TEXT  ISO-8601 — the sync high-water-mark cursor
 *   deleted_at  TEXT  ISO-8601, nullable — soft-delete tombstone
 */
import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  deletedAt: text("deleted_at"),
};

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  dobHash: text("dob_hash").notNull(),
  ...timestamps,
});

export const courses = sqliteTable(
  "courses",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id").notNull(),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    rounds: integer("rounds").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("courses_profile_external_uq").on(t.profileId, t.externalId),
    index("courses_profile_idx").on(t.profileId),
  ],
);

export const games = sqliteTable(
  "games",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id").notNull(),
    externalId: text("external_id").notNull(),
    courseId: text("course_id").notNull(),
    date: text("date").notNull(),
    finalNote: text("final_note"),
    finalScore: integer("final_score"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("games_profile_external_uq").on(t.profileId, t.externalId),
    index("games_profile_idx").on(t.profileId),
    index("games_course_idx").on(t.courseId),
  ],
);

export const scores = sqliteTable(
  "scores",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id").notNull(),
    externalId: text("external_id").notNull(),
    gameId: text("game_id").notNull(),
    hole: integer("hole").notNull(),
    par: text("par").notNull(),
    score: text("score").notNull(),
    putts: integer("putts").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("scores_profile_external_uq").on(t.profileId, t.externalId),
    index("scores_profile_idx").on(t.profileId),
    index("scores_game_idx").on(t.gameId),
  ],
);

export const schema = { profiles, courses, games, scores };

export type SyncTableName = "profiles" | "courses" | "games" | "scores";
export const tableMap = {
  profiles,
  courses,
  games,
  scores,
} as const;
