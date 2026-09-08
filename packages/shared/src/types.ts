/**
 * Wire contract shared between the web client (`apps/web/lib/cloud-sync.ts`)
 * and the sync service (`services/profile-sync`).
 *
 * These types describe exactly what crosses the network today. The client sends
 * raw IndexedDB rows (camelCase, numeric local ids); the server returns its own
 * rows (snake_case, UUID ids, soft-delete tombstones). Both shapes are modelled
 * here so neither side has to guess.
 */

export type SyncTable = "profiles" | "courses" | "games" | "scores";

export const SYNC_TABLES: readonly SyncTable[] = [
  "profiles",
  "courses",
  "games",
  "scores",
] as const;

/** ISO-8601 high-water-mark cursor per table (null = client has never synced it). */
export interface SyncCursors {
  profiles?: string | null;
  courses?: string | null;
  games?: string | null;
  scores?: string | null;
}

export interface SyncCounts {
  profiles: number;
  courses: number;
  games: number;
  scores: number;
}

// ---------------------------------------------------------------------------
// Client payload rows — what `collectSyncData()` sends up in /sync/push
// ---------------------------------------------------------------------------

export interface ClientProfile {
  id: string; // client-generated UUID
  username: string;
  dobHash: string;
  createdAt?: string;
  lastActiveAt?: string;
}

export interface ClientCourse {
  id?: number; // Dexie autoincrement local id
  name: string;
  rounds: number; // 9 | 18
  profileId: string;
}

export interface ClientGame {
  id?: number;
  date: string; // ISO string (Date is serialized on the wire)
  courseId: number;
  finalNote?: string | null;
  finalScore?: number | null;
}

export interface ClientScore {
  id?: number;
  gameId: number;
  hole: number;
  par: string;
  score: string;
  putts: number;
}

export interface SyncMetadata {
  deviceId: string;
  lastSync?: string;
  version?: string;
  syncType?: string;
}

export interface SyncData {
  profiles: ClientProfile[];
  courses: ClientCourse[];
  games: ClientGame[];
  scores: ClientScore[];
  metadata: SyncMetadata;
}

// ---------------------------------------------------------------------------
// Server rows — what /sync/pull returns
// ---------------------------------------------------------------------------

interface ServerRowBase {
  id: string; // UUID
  external_id: string;
  profile_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ServerProfile {
  id: string;
  username: string;
  dob_hash: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ServerCourse extends ServerRowBase {
  name: string;
  rounds: number;
}

export interface ServerGame extends ServerRowBase {
  course_id: string;
  /** external_id of the owning course, e.g. `course:7` — lets the client resolve its local id. */
  course_external_id: string | null;
  date: string;
  final_note: string | null;
  final_score: number | null;
}

export interface ServerScore extends ServerRowBase {
  game_id: string;
  /** external_id of the owning game, e.g. `game:42`. */
  game_external_id: string | null;
  hole: number;
  par: string;
  score: string;
  putts: number;
}

export interface ServerChanges {
  profiles: ServerProfile[];
  courses: ServerCourse[];
  games: ServerGame[];
  scores: ServerScore[];
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

export interface HealthResponse {
  ok: true;
}

export interface SyncStateResponse {
  inSync: boolean;
  serverCursors?: SyncCursors;
  counts?: SyncCounts;
}

export interface SyncPushResponse {
  status: "ok";
  saved: SyncCounts;
  serverCursors: SyncCursors;
}

export interface SyncPullResponse {
  changes: ServerChanges;
  serverCursors: SyncCursors;
}

// ---------------------------------------------------------------------------
// Client-side sync status (used by the web UI, not sent over the wire)
// ---------------------------------------------------------------------------

export interface SyncStatus {
  lastSync: string | null;
  isEnabled: boolean;
  isSyncing: boolean;
  lastError: string | null;
  nextSyncTime: string | null;
}
