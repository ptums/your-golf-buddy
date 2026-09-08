"use client";

import { cloudSync, SyncStatus } from "./cloud-sync";

export interface SyncTrigger {
  type: "app_startup" | "online_status" | "game_completion";
  timestamp: string;
  reason: string;
}

export interface SyncManagerConfig {
  enableStartupSync: boolean;
  enableOnlineSync: boolean;
  enableGameCompletionSync: boolean;
  startupSyncDelay: number; // ms
  onlineSyncDelay: number; // ms
  gameCompletionSyncDelay: number; // ms
}

class SyncManager {
  private config: SyncManagerConfig = {
    enableStartupSync: true,
    enableOnlineSync: true,
    enableGameCompletionSync: true,
    startupSyncDelay: 2000, // 2 seconds after app loads
    onlineSyncDelay: 3000, // 3 seconds after coming online
    gameCompletionSyncDelay: 1000, // 1 second after game completion
  };

  private isInitialized = false;
  private lastOnlineStatus = true;
  private syncHistory: SyncTrigger[] = [];
  private startupSyncTimeout: NodeJS.Timeout | null = null;
  private onlineSyncTimeout: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.initialize();
    }
  }

  private async initialize() {
    if (this.isInitialized) return;

    console.log("SyncManager: Initializing...");

    // Set up online/offline monitoring
    this.setupOnlineStatusMonitoring();

    // Set up startup sync
    if (this.config.enableStartupSync) {
      this.scheduleStartupSync();
    }

    this.isInitialized = true;
    console.log("SyncManager: Initialized successfully");
  }

  private setupOnlineStatusMonitoring() {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      console.log("SyncManager: Device came online");
      this.lastOnlineStatus = true;

      if (this.config.enableOnlineSync) {
        this.scheduleOnlineSync();
      }
    };

    const handleOffline = () => {
      console.log("SyncManager: Device went offline");
      this.lastOnlineStatus = false;

      // Clear any pending online sync
      if (this.onlineSyncTimeout) {
        clearTimeout(this.onlineSyncTimeout);
        this.onlineSyncTimeout = null;
      }
    };

    // Set initial status
    this.lastOnlineStatus = navigator.onLine;

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Store cleanup function
    this.cleanupFunctions.push(() => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    });
  }

  private scheduleStartupSync() {
    if (this.startupSyncTimeout) {
      clearTimeout(this.startupSyncTimeout);
    }

    this.startupSyncTimeout = setTimeout(async () => {
      await this.performSync("app_startup", "App startup sync check");
    }, this.config.startupSyncDelay);
  }

  private scheduleOnlineSync() {
    if (this.onlineSyncTimeout) {
      clearTimeout(this.onlineSyncTimeout);
    }

    this.onlineSyncTimeout = setTimeout(async () => {
      await this.performSync("online_status", "Device came back online");
    }, this.config.onlineSyncDelay);
  }

  private async performSync(
    type: SyncTrigger["type"],
    reason: string
  ): Promise<boolean> {
    if (!cloudSync) {
      console.warn("SyncManager: CloudSync not available");
      return false;
    }

    const syncStatus = cloudSync.getSyncStatus();
    if (!syncStatus.isEnabled) {
      console.log("SyncManager: Sync is disabled, skipping");
      return false;
    }

    // Check if we're already syncing
    if (syncStatus.isSyncing) {
      console.log("SyncManager: Sync already in progress, skipping");
      return false;
    }

    // Record this sync trigger
    const trigger: SyncTrigger = {
      type,
      timestamp: new Date().toISOString(),
      reason,
    };
    this.syncHistory.push(trigger);

    // Keep only last 10 sync triggers
    if (this.syncHistory.length > 10) {
      this.syncHistory = this.syncHistory.slice(-10);
    }

    console.log(`SyncManager: Performing ${type} sync - ${reason}`);

    try {
      const success = await cloudSync.forceSync();

      if (success) {
        console.log(`SyncManager: ${type} sync completed successfully`);
      } else {
        console.warn(`SyncManager: ${type} sync failed`);
      }

      return success;
    } catch (error) {
      console.error(`SyncManager: ${type} sync error:`, error);
      return false;
    }
  }

  // Public API for game completion sync
  async triggerGameCompletionSync(): Promise<boolean> {
    if (!this.config.enableGameCompletionSync) {
      console.log("SyncManager: Game completion sync disabled");
      return false;
    }

    // Small delay to ensure game data is fully saved
    return new Promise((resolve) => {
      setTimeout(async () => {
        const success = await this.performSync(
          "game_completion",
          "Game completed"
        );
        resolve(success);
      }, this.config.gameCompletionSyncDelay);
    });
  }

  // Public API for manual sync trigger
  async triggerManualSync(reason: string = "Manual sync"): Promise<boolean> {
    return this.performSync("app_startup", reason);
  }

  // Configuration methods
  updateConfig(newConfig: Partial<SyncManagerConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log("SyncManager: Configuration updated", this.config);
  }

  getConfig(): SyncManagerConfig {
    return { ...this.config };
  }

  // Status and history methods
  getSyncHistory(): SyncTrigger[] {
    return [...this.syncHistory];
  }

  getLastSyncTrigger(): SyncTrigger | null {
    return this.syncHistory.length > 0
      ? this.syncHistory[this.syncHistory.length - 1]
      : null;
  }

  isOnline(): boolean {
    return this.lastOnlineStatus;
  }

  getSyncStatus(): SyncStatus | null {
    return cloudSync?.getSyncStatus() || null;
  }

  // Cleanup
  private cleanupFunctions: (() => void)[] = [];

  destroy() {
    console.log("SyncManager: Destroying...");

    // Clear timeouts
    if (this.startupSyncTimeout) {
      clearTimeout(this.startupSyncTimeout);
      this.startupSyncTimeout = null;
    }

    if (this.onlineSyncTimeout) {
      clearTimeout(this.onlineSyncTimeout);
      this.onlineSyncTimeout = null;
    }

    // Run cleanup functions
    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions = [];

    this.isInitialized = false;
    console.log("SyncManager: Destroyed");
  }
}

// Export singleton instance only in browser environment
export const syncManager =
  typeof window !== "undefined" ? new SyncManager() : null;

// Cleanup on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (syncManager) {
      syncManager.destroy();
    }
  });
}

// Export types for use in components
// (Commented out due to missing exports in ./cloud-sync)
// export type SyncTrigger = import("./cloud-sync").SyncTrigger;
// export type SyncManagerConfig = import("./cloud-sync").SyncManagerConfig;
