"use client";

// Mounting this on the client pulls in the sync-manager module, whose
// constructor schedules the single once-per-open startup sync. Renders nothing.
import "@/lib/sync-manager";

export default function SyncManagerInitializer() {
  return null;
}
