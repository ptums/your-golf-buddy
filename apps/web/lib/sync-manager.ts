"use client";

import { cloudSync, type SyncStatus } from "./cloud-sync";

export interface SyncTrigger {
  type: "app_startup" | "game_completion" | "manual";
  timestamp: string;
  reason: string;
}

/**
 * Decides *when* to sync. By design there are only two automatic triggers:
 *
 *   1. once, shortly after the app is opened
 *   2. when a round is finished
 *
 * No background timer, no online/offline listener — those made it sync every
 * few seconds on a flaky course connection.
 */
class SyncManager {
  private startupDone = false;
  private history: SyncTrigger[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      // Give the app a moment to settle, then do the one startup sync.
      setTimeout(() => void this.runStartupSync(), 2000);
    }
  }

  private async run(type: SyncTrigger["type"], reason: string): Promise<boolean> {
    if (!cloudSync) return false;
    const status = cloudSync.getSyncStatus();
    if (!status.isEnabled || status.isSyncing) return false;

    this.history.push({ type, timestamp: new Date().toISOString(), reason });
    if (this.history.length > 10) this.history = this.history.slice(-10);

    try {
      return await cloudSync.forceSync();
    } catch (err) {
      console.error("SyncManager: sync failed", err);
      return false;
    }
  }

  private async runStartupSync(): Promise<void> {
    if (this.startupDone) return;
    this.startupDone = true;
    await this.run("app_startup", "App opened");
  }

  /** Called from the round screen when the player taps "Finish round". */
  async triggerGameCompletionSync(): Promise<boolean> {
    // brief delay so the last hole is committed to IndexedDB first
    await new Promise((r) => setTimeout(r, 400));
    return this.run("game_completion", "Round finished");
  }

  /** "Sync now" button in Settings. */
  async triggerManualSync(reason = "Manual sync"): Promise<boolean> {
    return this.run("manual", reason);
  }

  getSyncHistory(): SyncTrigger[] {
    return [...this.history];
  }

  getLastSyncTrigger(): SyncTrigger | null {
    return this.history.at(-1) ?? null;
  }

  getSyncStatus(): SyncStatus | null {
    return cloudSync?.getSyncStatus() ?? null;
  }
}

export const syncManager =
  typeof window !== "undefined" ? new SyncManager() : null;
