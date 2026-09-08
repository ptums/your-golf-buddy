import { SYNC_TABLES, type SyncCursors, type SyncStateResponse } from "@ygb/shared";
import type { Db } from "../db/client.js";
import { allCursors, countAll } from "./cursors.js";

/**
 * Compare the client's per-table cursors against the server's, scoped to one
 * profile. If every cursor matches, the client is in sync; otherwise return the
 * server cursors plus row counts. Ported from Laravel
 * `SyncController::checkSyncState()`.
 */
export async function checkSyncState(
  db: Db,
  profileId: string,
  clientCursors: SyncCursors,
): Promise<SyncStateResponse> {
  const serverCursors = await allCursors(db, profileId);

  const inSync = SYNC_TABLES.every(
    (t) => (clientCursors[t] ?? null) === (serverCursors[t] ?? null),
  );

  if (inSync) return { inSync: true };

  return {
    inSync: false,
    serverCursors,
    counts: await countAll(db, profileId),
  };
}
