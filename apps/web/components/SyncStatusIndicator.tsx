"use client";

import { useState, useEffect } from "react";
import { syncManager, SyncTrigger } from "@/lib/sync-manager";
import { SyncStatus } from "@/lib/cloud-sync";

interface SyncStatusIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

export default function SyncStatusIndicator({
  showDetails = false,
  className = "",
}: SyncStatusIndicatorProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [lastTrigger, setLastTrigger] = useState<SyncTrigger | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!syncManager) return;

    const updateStatus = () => {
      if (!syncManager) return;
      setSyncStatus(syncManager.getSyncStatus());
      setLastTrigger(syncManager.getLastSyncTrigger());
      setIsOnline(syncManager.isOnline());
    };

    // Initial update
    updateStatus();

    // Update every 2 seconds
    const interval = setInterval(updateStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!syncStatus) return null;

  const getStatusIcon = () => {
    if (!syncStatus.isEnabled) return "⚪"; // Disabled
    if (syncStatus.isSyncing) return "🔄"; // Syncing
    if (syncStatus.lastError) return "❌"; // Error
    if (!isOnline) return "📡"; // Offline
    return "✅"; // Success
  };

  const getStatusText = () => {
    if (!syncStatus.isEnabled) return "Sync disabled";
    if (syncStatus.isSyncing) return "Syncing...";
    if (syncStatus.lastError) return "Sync error";
    if (!isOnline) return "Offline";
    return "Synced";
  };

  const getStatusColor = () => {
    if (!syncStatus.isEnabled) return "text-gray-400";
    if (syncStatus.isSyncing) return "text-blue-500";
    if (syncStatus.lastError) return "text-red-500";
    if (!isOnline) return "text-yellow-500";
    return "text-green-500";
  };

  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className={`text-sm ${getStatusColor()}`}>{getStatusIcon()}</span>

      {showDetails && (
        <div className="text-xs text-gray-600">
          <div>{getStatusText()}</div>
          {syncStatus.lastSync && (
            <div>Last: {formatLastSync(syncStatus.lastSync)}</div>
          )}
          {lastTrigger && (
            <div className="text-gray-500">
              Trigger: {lastTrigger.type.replace("_", " ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
