"use client";

import { useEffect, useRef, useState } from "react";

type Kind = "syncing" | "success" | "error";

const read = (k: string) =>
  typeof window === "undefined" ? null : localStorage.getItem(k);

export default function SyncNotification() {
  const [kind, setKind] = useState<Kind | null>(null);
  // Timestamps already handled, so a stale "success" left in localStorage from
  // a previous session or an idle poll doesn't re-trigger the toast.
  const seenSuccess = useRef<string | null>(null);
  const seenError = useRef<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    seenSuccess.current = read("golf_buddy_last_success");
    seenError.current = read("golf_buddy_last_error_at");

    const show = (next: Kind, autoHideMs?: number) => {
      setKind(next);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (autoHideMs) {
        hideTimer.current = setTimeout(() => setKind(null), autoHideMs);
      }
    };

    const tick = () => {
      const enabled = read("golf_buddy_sync_enabled") === "true";
      const status = read("golf_buddy_sync_status");
      const lastSuccess = read("golf_buddy_last_success");
      const lastError = read("golf_buddy_last_error_at");

      if (enabled && status === "syncing") {
        show("syncing");
        return;
      }
      if (lastError && lastError !== seenError.current) {
        seenError.current = lastError;
        show("error", 5000);
        return;
      }
      if (lastSuccess && lastSuccess !== seenSuccess.current) {
        seenSuccess.current = lastSuccess;
        show("success", 3000);
        return;
      }
      // nothing new — don't touch `kind`; its own auto-hide timer clears it
    };

    tick();
    const interval = setInterval(tick, 2000);
    return () => {
      clearInterval(interval);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!kind) return null;

  const content: Record<Kind, { icon: string; text: string; className: string }> =
    {
      syncing: {
        icon: "🔄",
        text: "Syncing to cloud...",
        className: "bg-blue-500 text-white",
      },
      success: {
        icon: "✅",
        text: "Sync completed",
        className: "bg-green-500 text-white",
      },
      error: {
        icon: "❌",
        text: "Sync failed",
        className: "bg-red-500 text-white",
      },
    };

  const c = content[kind];

  return (
    <div
      className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${c.className}`}
    >
      <div className="flex items-center space-x-2">
        <span className="text-lg">{c.icon}</span>
        <span className="text-sm font-medium">{c.text}</span>
      </div>
    </div>
  );
}
