"use client";

import { useState, useEffect } from "react";

export default function SyncNotification() {
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check sync status periodically
    const checkSyncStatus = () => {
      const status = localStorage.getItem("golf_buddy_sync_status");
      const isEnabled =
        localStorage.getItem("golf_buddy_sync_enabled") === "true";

      if (isEnabled && status === "syncing") {
        setSyncStatus("syncing");
        setIsVisible(true);
      } else if (status === "success") {
        setSyncStatus("success");
        setIsVisible(true);
        // Hide success message after 3 seconds
        setTimeout(() => setIsVisible(false), 3000);
      } else if (status === "error") {
        setSyncStatus("error");
        setIsVisible(true);
        // Hide error message after 5 seconds
        setTimeout(() => setIsVisible(false), 5000);
      } else {
        setIsVisible(false);
      }
    };

    // Check immediately
    checkSyncStatus();

    // Check every 2 seconds
    const interval = setInterval(checkSyncStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible || !syncStatus) return null;

  const getNotificationContent = () => {
    switch (syncStatus) {
      case "syncing":
        return {
          icon: "🔄",
          text: "Syncing to cloud...",
          className: "bg-blue-500 text-white",
        };
      case "success":
        return {
          icon: "✅",
          text: "Sync completed",
          className: "bg-green-500 text-white",
        };
      case "error":
        return {
          icon: "❌",
          text: "Sync failed",
          className: "bg-red-500 text-white",
        };
      default:
        return null;
    }
  };

  const content = getNotificationContent();
  if (!content) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${content.className}`}
    >
      <div className="flex items-center space-x-2">
        <span className="text-lg">{content.icon}</span>
        <span className="text-sm font-medium">{content.text}</span>
      </div>
    </div>
  );
}
