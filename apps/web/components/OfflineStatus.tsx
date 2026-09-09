"use client";

import { useEffect, useState } from "react";

/** Shows a small ink "Offline" rail chip only when the connection drops.
 *  Design: color/icons never carry meaning — network state is plain text. */
export default function OfflineStatus() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    setOffline(!navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;
  return <span className="bs-rail bs-rail-ink">Offline</span>;
}
