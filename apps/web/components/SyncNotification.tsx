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
      const startedAt = Number(read("golf_buddy_sync_started_at") ?? 0);
      const freshlySyncing = Date.now() - startedAt < 30_000;

      // Only ever a transient toast — a "syncing" flag left by a killed tab
      // goes stale after 30s and is ignored.
      if (enabled && status === "syncing" && freshlySyncing) {
        show("syncing", 30_000);
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

  const text: Record<Kind, string> = {
    syncing: "Syncing…",
    success: "Synced",
    error: "Sync issue · see Settings",
  };

  return (
    <div className="bs-box fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-[10px]">
      <span className="bs-rail bs-rail-ink">{text[kind]}</span>
    </div>
  );
}
