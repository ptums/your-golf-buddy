"use client";

import { useEffect } from "react";
import { syncManager } from "@/lib/sync-manager";

/**
 * SyncManagerInitializer - A component that ensures the SyncManager is properly initialized
 * This component runs once when the app loads and doesn't render anything visible
 */
export default function SyncManagerInitializer() {
  useEffect(() => {
    // The SyncManager is already initialized when imported, but this ensures
    // it's properly set up in the React component lifecycle
    if (syncManager) {
      console.log("SyncManagerInitializer: SyncManager is ready");

      // You can add any additional initialization logic here if needed
      // For example, checking sync status, enabling sync by default, etc.

      // Optional: Enable sync by default if not already configured
      const syncStatus = syncManager.getSyncStatus();
      if (syncStatus && !syncStatus.isEnabled) {
        console.log(
          "SyncManagerInitializer: Sync is disabled, user can enable in settings"
        );
      }
    } else {
      console.warn("SyncManagerInitializer: SyncManager not available (SSR)");
    }
  }, []);

  // This component doesn't render anything
  return null;
}
