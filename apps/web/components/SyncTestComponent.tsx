"use client";

import { useState, useEffect } from "react";
import { syncManager, SyncTrigger } from "@/lib/sync-manager";
import { cloudSync } from "@/lib/cloud-sync";
import SyncStatusIndicator from "@/components/SyncStatusIndicator";

/**
 * SyncTestComponent - A component for testing and demonstrating sync functionality
 * This can be used in development or added to a debug/settings page
 */
export default function SyncTestComponent() {
  const [isOnline, setIsOnline] = useState(true);
  const [syncHistory, setSyncHistory] = useState<SyncTrigger[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      if (!syncManager) return;
      setIsOnline(syncManager.isOnline());
      setSyncHistory(syncManager.getSyncHistory());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleTestSync = async () => {
    if (!syncManager) return;

    setIsLoading(true);
    try {
      await syncManager.triggerManualSync("Test sync from debug component");
      setSyncHistory(syncManager.getSyncHistory());
    } catch (error) {
      console.error("Test sync failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableSync = async () => {
    if (!cloudSync) return;

    setIsLoading(true);
    try {
      await cloudSync.enableSync();
    } catch (error) {
      console.error("Failed to enable sync:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!syncManager) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">SyncManager not available (SSR)</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Sync Test Panel</h3>

      {/* Status Indicators */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Online Status:</span>
          <span
            className={`text-sm font-medium ${
              isOnline ? "text-green-600" : "text-red-600"
            }`}
          >
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>

        <SyncStatusIndicator showDetails={true} />
      </div>

      {/* Test Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleTestSync}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Testing..." : "Test Manual Sync"}
        </button>

        <button
          onClick={handleEnableSync}
          disabled={isLoading}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Enable Sync
        </button>
      </div>

      {/* Sync History */}
      {syncHistory.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Sync History
          </h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {syncHistory
              .slice(-10)
              .reverse()
              .map((trigger, index) => (
                <div
                  key={`${trigger.timestamp}-${index}`}
                  className="text-xs text-gray-600 bg-gray-50 p-2 rounded"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {trigger.type.replace("_", " ")}
                    </span>
                    <span>
                      {new Date(trigger.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-gray-500">{trigger.reason}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
        <p className="font-medium mb-1">Test Instructions:</p>
        <ul className="space-y-1">
          <li>• Refresh the page to test app startup sync</li>
          <li>• Turn off WiFi/cellular to test offline detection</li>
          <li>• Turn back on to test online sync trigger</li>
          <li>• Complete a game to test game completion sync</li>
          <li>
            • Use &quot;Test Manual Sync&quot; to trigger sync immediately
          </li>
        </ul>
      </div>
    </div>
  );
}
