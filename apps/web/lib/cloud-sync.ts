/* eslint-disable @typescript-eslint/no-explicit-any */
import { profileDB } from "./profile-db";
import { db } from "./db";

export interface SyncStatus {
  lastSync: string | null;
  isEnabled: boolean;
  isSyncing: boolean;
  lastError: string | null;
  nextSyncTime: string | null;
}

export interface SyncCursors {
  profiles?: string | null;
  courses?: string | null;
  games?: string | null;
  scores?: string | null;
}

export interface SyncStateResponse {
  inSync: boolean;
  serverCursors?: SyncCursors;
  counts?: {
    profiles: number;
    courses: number;
    games: number;
    scores: number;
  };
}

export interface SyncPushResponse {
  status: string;
  saved: {
    profiles: number;
    courses: number;
    games: number;
    scores: number;
  };
  serverCursors: SyncCursors;
}

export interface SyncPullResponse {
  changes: {
    profiles: any[];
    courses: any[];
    games: any[];
    scores: any[];
  };
  serverCursors: SyncCursors;
}

export interface SyncData {
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

      // Step 1: Check sync state
      const syncState = await this.checkSyncState();

      if (syncState.inSync) {
        console.log("Data is already in sync");
        localStorage.setItem("golf_buddy_sync_status", "success");
        this.setLastSyncTime(new Date().toISOString());
        this.scheduleNextSync();
        return true;
      }

      // Step 2: Push local changes
      const pushSuccess = await this.pushChanges();
      if (!pushSuccess) {
        throw new Error("Failed to push changes");
      }

      // Step 3: Pull server changes
      const pullSuccess = await this.pullChanges();
      if (!pullSuccess) {
        throw new Error("Failed to pull changes");
      }

      localStorage.setItem("golf_buddy_sync_status", "success");
      this.setLastSyncTime(new Date().toISOString());
      this.scheduleNextSync();
      return true;
    } catch (error) {
      console.error("Sync error:", error);
      localStorage.setItem("golf_buddy_sync_status", "error");
      localStorage.setItem(
        "golf_buddy_last_error",
        error instanceof Error ? error.message : "Unknown error"
      );
      return false;
    }
  }

  private async checkSyncState(): Promise<SyncStateResponse> {
    const cursors = this.getCursors();

    const response = await fetch(`${this.SYNC_BASE_URL}/sync/state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cursors }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  private async pushChanges(): Promise<boolean> {
    try {
      const syncData = await this.collectSyncData();

      const response = await fetch(`${this.SYNC_BASE_URL}/sync/push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        headers: {
          "Content-Type": "application/json",
        },
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

  private async applyChanges(
    changes: SyncPullResponse["changes"]
  ): Promise<void> {
    if (changes.courses.length > 0 && db) {
      await db.courses.bulkPut(changes.courses);
    }

    if (changes.games.length > 0 && db) {
      await db.games.bulkPut(changes.games);
    }

    if (changes.scores.length > 0 && db) {
      await db.scores.bulkPut(changes.scores);
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
