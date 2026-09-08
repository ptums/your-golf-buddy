"use client";

import { useState, useEffect } from "react";
import { cloudSync, SyncStatus } from "@/lib/cloud-sync";
import { syncManager, SyncTrigger } from "@/lib/sync-manager";

export default function SyncSettings() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncTrigger[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      if (cloudSync) {
        setSyncStatus(cloudSync.getSyncStatus());
      }
      if (syncManager) {
        setSyncHistory(syncManager.getSyncHistory());
      }
    };

    updateStatus();

    // Update every 2 seconds
    const interval = setInterval(updateStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleToggleSync = async () => {
    if (!cloudSync) return;

    setIsLoading(true);
    try {
      if (syncStatus?.isEnabled) {
        await cloudSync.disableSync();
      } else {
        await cloudSync.enableSync();
      }
      setSyncStatus(cloudSync.getSyncStatus());
    } catch (error) {
      console.error("Failed to toggle sync:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceSync = async () => {
    if (!syncManager || !syncStatus?.isEnabled) return;

    setIsLoading(true);
    try {
      await syncManager.triggerManualSync("Manual sync from settings");
      if (cloudSync) {
        setSyncStatus(cloudSync.getSyncStatus());
      }
      if (syncManager) {
        setSyncHistory(syncManager.getSyncHistory());
      }
    } catch (error) {
      console.error("Failed to force sync:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!syncStatus) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-amber-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Cloud Sync</h3>

      <div className="space-y-4">
        {/* Sync Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-700">Enable Cloud Sync</p>
            <p className="text-sm text-slate-500">
              Automatically sync your golf data to the cloud once daily
            </p>
          </div>
          <button
            onClick={handleToggleSync}
            disabled={isLoading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              syncStatus.isEnabled ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                syncStatus.isEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Sync Status */}
        {syncStatus.isEnabled && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Status:</span>
              <span
                className={`font-medium ${
                  syncStatus.isSyncing
                    ? "text-blue-600"
                    : syncStatus.lastError
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {syncStatus.isSyncing
                  ? "Syncing..."
                  : syncStatus.lastError
                  ? "Error"
                  : "Active"}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Last Sync:</span>
              <span className="text-slate-800">
                {formatDate(syncStatus.lastSync)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Next Sync:</span>
              <span className="text-slate-800">
                {formatDate(syncStatus.nextSyncTime)}
              </span>
            </div>

            {syncStatus.lastError && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                Error: {syncStatus.lastError}
              </div>
            )}

            {/* Force Sync Button */}
            <button
              onClick={handleForceSync}
              disabled={isLoading || syncStatus.isSyncing}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Syncing..." : "Sync Now"}
            </button>

            {/* Sync History */}
            {syncHistory.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">
                  Recent Sync Triggers
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {syncHistory
                    .slice(-5)
                    .reverse()
                    .map((trigger, index) => (
                      <div
                        key={`${trigger.timestamp}-${index}`}
                        className="text-xs text-slate-600 bg-slate-50 p-2 rounded"
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">
                            {trigger.type.replace("_", " ")}
                          </span>
                          <span>
                            {new Date(trigger.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-slate-500">{trigger.reason}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Privacy Notice */}
        <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
          <p className="font-medium mb-1">Privacy Notice:</p>
          <p>
            When enabled, your golf data (scores, courses, practice notes) will
            be synced to our secure cloud servers. This allows you to access
            your data across devices and provides backup protection. Your data
            is encrypted in transit and at rest. You can disable sync at any
            time.
          </p>
        </div>
      </div>
    </div>
  );
}
