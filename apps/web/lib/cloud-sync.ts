/* eslint-disable @typescript-eslint/no-explicit-any */
import { profileDB } from "./profile-db";
import { db } from "./db";
import type {
  SyncCursors,
  SyncStatus,
  SyncPushResponse,
  ServerProfile,
  ServerCourse,
  ServerGame,
  ServerScore,
} from "@ygb/shared";

// The canonical wire contract lives in @ygb/shared and is shared with the
// profile-sync service. Re-exported here so existing `@/lib/cloud-sync`
// imports across the app keep resolving.
export type {
  SyncCursors,
  SyncStatus,
  SyncStateResponse,
  SyncPushResponse,
} from "@ygb/shared";

// `SyncData` still holds pre-serialization values (a Date on games), so it
// stays local rather than reusing the @ygb/shared type.
interface SyncPullResponse {
  changes: {
    profiles: ServerProfile[];
    courses: ServerCourse[];
    games: ServerGame[];
    scores: ServerScore[];
  };
  serverCursors: SyncCursors;
}

interface SyncData {
  profiles: any[];
  courses: any[];
  games: any[];
  scores: any[];
  metadata: {
    deviceId: string;
    lastSync: string;
    version: string;
  };
}

/** Pull a profile UUID out of whatever the user pasted (bare, or with noise). */
export function extractProfileKey(input: string): string | null {
  const m = input.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  return m ? m[0].toLowerCase() : null;
}

class CloudSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly SYNC_BASE_URL =
    process.env.NEXT_PUBLIC_SYNC_ENDPOINT || "http://localhost:8000/api";
  private readonly DEVICE_ID_KEY = "golf_buddy_device_id";
  private readonly CURSORS_KEY = "golf_buddy_sync_cursors";

  constructor() {
    this.initializeSync();
  }

  private initializeSync() {
    if (typeof window === "undefined") return;

    // Generate or retrieve device ID
    this.ensureDeviceId();

    // Check if sync is enabled
    if (this.isSyncEnabled()) {
      this.scheduleNextSync();
    }
  }

  private ensureDeviceId(): string {
    let deviceId = localStorage.getItem(this.DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem(this.DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  private isSyncEnabled(): boolean {
    return localStorage.getItem("golf_buddy_sync_enabled") === "true";
  }

  private setSyncEnabled(enabled: boolean) {
    localStorage.setItem("golf_buddy_sync_enabled", enabled.toString());
  }

  private getLastSyncTime(): string | null {
    return localStorage.getItem("golf_buddy_last_sync");
  }

  private setLastSyncTime(time: string) {
    localStorage.setItem("golf_buddy_last_sync", time);
  }

  private getCursors(): SyncCursors {
    const cursors = localStorage.getItem(this.CURSORS_KEY);
    return cursors ? JSON.parse(cursors) : {};
  }

  private setCursors(cursors: SyncCursors) {
    localStorage.setItem(this.CURSORS_KEY, JSON.stringify(cursors));
  }

  private scheduleNextSync() {
    if (this.syncInterval) {
      clearTimeout(this.syncInterval);
    }

    const lastSync = this.getLastSyncTime();
    const nextSync = lastSync
      ? new Date(new Date(lastSync).getTime() + this.SYNC_INTERVAL_MS)
      : new Date(Date.now() + this.SYNC_INTERVAL_MS);

    const delay = nextSync.getTime() - Date.now();

    this.syncInterval = setTimeout(() => {
      this.performSync();
    }, delay);

    // Store next sync time for UI display
    localStorage.setItem("golf_buddy_next_sync", nextSync.toISOString());
  }

  async performSync(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    if (!this.isSyncEnabled()) return false;

    try {
      // Set syncing status
      localStorage.setItem("golf_buddy_sync_status", "syncing");

      // Always push: upserts are idempotent, and the client can't reliably
      // tell whether its local data is already on the server (a cursor-only
      // check reports "in sync" whenever both sides look empty).
      const pushSuccess = await this.pushChanges();
      if (!pushSuccess) {
        throw new Error("Failed to push changes");
      }

      // Then pull anything new from the server.
      const pullSuccess = await this.pullChanges();
      if (!pullSuccess) {
        throw new Error("Failed to pull changes");
      }

      localStorage.setItem("golf_buddy_sync_status", "success");
      this.setLastSyncTime(new Date().toISOString());
      localStorage.setItem("golf_buddy_last_success", Date.now().toString());
      this.scheduleNextSync();
      return true;
    } catch (error) {
      console.error("Sync error:", error);
      localStorage.setItem("golf_buddy_sync_status", "error");
      localStorage.setItem(
        "golf_buddy_last_error",
        error instanceof Error ? error.message : "Unknown error"
      );
      localStorage.setItem("golf_buddy_last_error_at", Date.now().toString());
      return false;
    }
  }

  /**
   * The profile's UUID doubles as the auth token — the server scopes every
   * request to it. Read from localStorage (set at profile creation).
   */
  private getProfileId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("golf_buddy_profile_id");
  }

  private authHeaders(): Record<string, string> {
    const profileId = this.getProfileId();
    if (!profileId) throw new Error("No profile — cannot sync");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${profileId}`,
    };
    // Golf Buddy Pass, if the user has entered one (Settings). Harmless when
    // the server isn't enforcing it yet; required once PASS_ENFORCED is on.
    const pass =
      typeof window !== "undefined"
        ? localStorage.getItem("golf_buddy_pass")
        : null;
    if (pass) headers["X-Golf-Pass"] = pass;
    return headers;
  }

  private async pushChanges(): Promise<boolean> {
    try {
      const syncData = await this.collectSyncData();

      const response = await fetch(`${this.SYNC_BASE_URL}/sync/push`, {
        method: "POST",
        headers: this.authHeaders(),
        body: JSON.stringify(syncData),
      });

      console.log("response", response);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: SyncPushResponse = await response.json();

      // Update cursors with server response
      this.setCursors(result.serverCursors);

      console.log("Push successful:", result.saved);
      return true;
    } catch (error) {
      console.error("Failed to push changes:", error);
      return false;
    }
  }

  private async pullChanges(): Promise<boolean> {
    try {
      const cursors = this.getCursors();

      const response = await fetch(`${this.SYNC_BASE_URL}/sync/pull`, {
        method: "POST",
        headers: this.authHeaders(),
        body: JSON.stringify({ cursors, limit: 100 }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: SyncPullResponse = await response.json();

      // Apply changes to local database
      await this.applyChanges(result.changes);

      // Update cursors with server response
      this.setCursors(result.serverCursors);

      console.log(
        "Pull successful:",
        Object.keys(result.changes)
          .map(
            (k) =>
              `${k}: ${result.changes[k as keyof typeof result.changes].length}`
          )
          .join(", ")
      );
      return true;
    } catch (error) {
      console.error("Failed to pull changes:", error);
      return false;
    }
  }

  /**
   * Merge server rows into the local Dexie stores.
   *
   * Server rows use UUID ids + snake_case; local rows use Dexie's numeric
   * autoincrement id. The bridge is `external_id` (`course:7`, `game:42`,
   * `score:9001`), which encodes the row's original local id — so we map
   * back to that and `put`/`delete` by it. Tombstones (`deleted_at`) become
   * deletes.
   */
  private async applyChanges(
    changes: SyncPullResponse["changes"]
  ): Promise<void> {
    // Profiles live in a separate IndexedDB (GolfBuddyProfiles). Keep the local
    // profile row in step with the server — this is also how a restore learns
    // the real username after adopting a key.
    const currentId = this.getProfileId();
    for (const p of changes.profiles) {
      if (!profileDB) break;
      if (p.deleted_at) {
        await profileDB.deleteProfile(p.id).catch(() => {});
      } else {
        await profileDB.putProfile({
          id: p.id,
          username: p.username,
          dobHash: p.dob_hash,
          createdAt: p.created_at,
          lastActiveAt: p.updated_at,
        });
        if (p.id === currentId && typeof window !== "undefined") {
          localStorage.setItem("golf_buddy_username", p.username);
        }
      }
    }

    if (!db) return;

    const localId = (external: string | null | undefined): number | null => {
      if (!external) return null;
      const n = Number(external.split(":").pop());
      return Number.isInteger(n) && n > 0 ? n : null;
    };

    for (const c of changes.courses) {
      const id = localId(c.external_id);
      if (id == null) continue;
      if (c.deleted_at) {
        await db.courses.delete(id);
      } else {
        await db.courses.put({
          id,
          name: c.name,
          rounds: c.rounds === 9 ? 9 : 18,
          profileId: c.profile_id,
        });
      }
    }

    for (const g of changes.games) {
      const id = localId(g.external_id);
      if (id == null) continue;
      if (g.deleted_at) {
        await db.games.delete(id);
        continue;
      }
      const courseId = localId(g.course_external_id);
      if (courseId == null) continue; // owning course not resolvable yet
      await db.games.put({
        id,
        courseId,
        date: new Date(g.date),
        finalNote: g.final_note ?? "",
        finalScore: g.final_score ?? 0,
        scores: [],
      });
    }

    for (const s of changes.scores) {
      const id = localId(s.external_id);
      if (id == null) continue;
      if (s.deleted_at) {
        await db.scores.delete(id);
        continue;
      }
      const gameId = localId(s.game_external_id);
      if (gameId == null) continue;
      await db.scores.put({
        id,
        gameId,
        hole: s.hole,
        par: s.par,
        score: s.score,
        putts: s.putts,
      });
    }
  }

  private async collectSyncData(): Promise<SyncData> {
    const deviceId = this.ensureDeviceId();

    // Collect data from IndexedDB
    const profiles = profileDB ? await profileDB.getAllProfiles() : [];
    const courses = db ? await db.courses.toArray() : [];
    const games = db ? await db.games.toArray() : [];
    const scores = db ? await db.scores.toArray() : [];

    return {
      profiles,
      courses,
      games,
      scores,
      metadata: {
        deviceId,
        lastSync: this.getLastSyncTime() || new Date().toISOString(),
        version: "1.0.0",
      },
    };
  }

  // Public API
  async enableSync(): Promise<void> {
    this.setSyncEnabled(true);
    this.scheduleNextSync();

    // Perform initial sync
    await this.performSync();
  }

  async disableSync(): Promise<void> {
    this.setSyncEnabled(false);
    if (this.syncInterval) {
      clearTimeout(this.syncInterval);
      this.syncInterval = null;
    }
    localStorage.removeItem("golf_buddy_next_sync");
  }

  async forceSync(): Promise<boolean> {
    return this.performSync();
  }

  /**
   * Ask the server to delete every row for this profile, then stop syncing and
   * forget the local sync cursors. Local rounds on this device are kept — the
   * caller decides whether to clear those too.
   */
  async deleteSyncedData(): Promise<boolean> {
    try {
      const response = await fetch(`${this.SYNC_BASE_URL}/sync/delete`, {
        method: "POST",
        headers: this.authHeaders(),
        body: "{}",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      await this.disableSync();
      localStorage.removeItem(this.CURSORS_KEY);
      localStorage.removeItem("golf_buddy_last_sync");
      return true;
    } catch (error) {
      console.error("Failed to delete synced data:", error);
      return false;
    }
  }

  /**
   * Adopt an existing profile from its key and pull its data down. Use this on
   * a new device / after clearing the browser. Returns the recovered username,
   * or null if the key is malformed or has no data on the server (in which case
   * nothing is left behind).
   */
  async restoreProfile(rawKey: string): Promise<string | null> {
    const id = extractProfileKey(rawKey);
    if (!id || typeof window === "undefined" || !profileDB) return null;

    const stubName = `golfer-${id.slice(0, 8)}`;
    await profileDB.putProfile({
      id,
      username: stubName,
      dobHash: "",
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    });
    localStorage.setItem("golf_buddy_profile_id", id);
    localStorage.setItem("golf_buddy_username", stubName);
    localStorage.removeItem(this.CURSORS_KEY);
    localStorage.removeItem("golf_buddy_last_sync");

    const pulled = await this.pullChanges(); // bearer token is now `id`
    const profile = pulled ? await profileDB.getProfileById(id) : null;
    const restored =
      profile && profile.username && !profile.username.startsWith("golfer-");

    if (!restored) {
      // clean up — no data for that key
      await profileDB.deleteProfile(id).catch(() => {});
      localStorage.removeItem("golf_buddy_profile_id");
      localStorage.removeItem("golf_buddy_username");
      localStorage.removeItem(this.CURSORS_KEY);
      return null;
    }

    localStorage.setItem("golf_buddy_username", profile.username);
    this.setSyncEnabled(true);
    this.setLastSyncTime(new Date().toISOString());
    this.scheduleNextSync();
    return profile.username;
  }

  getSyncStatus(): SyncStatus {
    console.log("getSyncStatus", {
      lastSync: this.getLastSyncTime(),
      isEnabled: this.isSyncEnabled(),
      isSyncing: localStorage.getItem("golf_buddy_sync_status") === "syncing",
      lastError: localStorage.getItem("golf_buddy_last_error"),
      nextSyncTime: localStorage.getItem("golf_buddy_next_sync"),
    });
    return {
      lastSync: this.getLastSyncTime(),
      isEnabled: this.isSyncEnabled(),
      isSyncing: localStorage.getItem("golf_buddy_sync_status") === "syncing",
      lastError: localStorage.getItem("golf_buddy_last_error"),
      nextSyncTime: localStorage.getItem("golf_buddy_next_sync"),
    };
  }

  // Cleanup
  destroy() {
    if (this.syncInterval) {
      clearTimeout(this.syncInterval);
    }
  }
}

// Export singleton instance only in browser environment
export const cloudSync =
  typeof window !== "undefined" ? new CloudSyncService() : null;

// Cleanup on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (cloudSync) {
      cloudSync.destroy();
    }
  });
}
