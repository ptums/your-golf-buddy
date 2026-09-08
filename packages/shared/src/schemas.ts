/**
 * Zod schemas for the sync request bodies.
 *
 * They are deliberately permissive: the web client posts raw IndexedDB rows,
 * so unknown keys are passed through and ids may be numbers or strings. The
 * server derives external ids and profile ownership from these.
 */
import { z } from "zod";

const cursorValue = z.string().datetime({ offset: true }).nullish();

export const syncCursorsSchema = z
  .object({
    profiles: cursorValue,
    courses: cursorValue,
    games: cursorValue,
    scores: cursorValue,
  })
  .partial();

export const clientProfileSchema = z
  .object({
    id: z.string().min(1),
    username: z.string().min(1),
    dobHash: z.string().min(1),
    createdAt: z.string().optional(),
    lastActiveAt: z.string().optional(),
  })
  .passthrough();

export const clientCourseSchema = z
  .object({
    id: z.union([z.number(), z.string()]).optional(),
    name: z.string().min(1),
    rounds: z.coerce.number().int(),
    profileId: z.string().min(1),
  })
  .passthrough();

export const clientGameSchema = z
  .object({
    id: z.union([z.number(), z.string()]).optional(),
    date: z.string(),
    courseId: z.union([z.number(), z.string()]),
    finalNote: z.string().nullish(),
    finalScore: z.coerce.number().int().nullish(),
  })
  .passthrough();

export const clientScoreSchema = z
  .object({
    id: z.union([z.number(), z.string()]).optional(),
    gameId: z.union([z.number(), z.string()]),
    hole: z.coerce.number().int(),
    par: z.coerce.string(),
    score: z.coerce.string(),
    putts: z.coerce.number().int(),
  })
  .passthrough();

export const syncMetadataSchema = z
  .object({
    deviceId: z.string().optional(),
    lastSync: z.string().optional(),
    version: z.string().optional(),
    syncType: z.string().optional(),
  })
  .passthrough();

export const syncStateRequestSchema = z.object({
  cursors: syncCursorsSchema.default({}),
  checksum: z.string().optional(),
});

export const syncPushRequestSchema = z.object({
  profiles: z.array(clientProfileSchema).default([]),
  courses: z.array(clientCourseSchema).default([]),
  games: z.array(clientGameSchema).default([]),
  scores: z.array(clientScoreSchema).default([]),
  metadata: syncMetadataSchema.optional(),
});

export const syncPullRequestSchema = z.object({
  cursors: syncCursorsSchema.default({}),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
});

export type SyncStateRequest = z.infer<typeof syncStateRequestSchema>;
export type SyncPushRequest = z.infer<typeof syncPushRequestSchema>;
export type SyncPullRequest = z.infer<typeof syncPullRequestSchema>;
