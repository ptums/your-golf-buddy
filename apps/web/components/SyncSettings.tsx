"use client";

import { useEffect, useState } from "react";
import { cloudSync, type SyncStatus } from "@/lib/cloud-sync";
import { syncManager } from "@/lib/sync-manager";
import Key from "@/components/broadsheet/Key";

const rel = (iso: string | null | undefined) => {
  if (!iso) return "never";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};

/** Formats the profile UUID as 4-char groups for the "move to a new phone" block. */
const grouped = (key: string) =>
  key.replace(/-/g, "").toUpperCase().match(/.{1,4}/g)?.join(" · ") ?? key;

export default function SyncSettings() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [profileKey, setProfileKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deviceId, setDeviceId] = useState("");

  const passEnabled = process.env.NEXT_PUBLIC_PASS_ENABLED === "true";
  const [passInput, setPassInput] = useState("");
  const [passSaved, setPassSaved] = useState(false);

  useEffect(() => {
    try {
      setProfileKey(localStorage.getItem("golf_buddy_profile_id"));
      setPassInput(localStorage.getItem("golf_buddy_pass") ?? "");
      setDeviceId((localStorage.getItem("golf_buddy_device_id") ?? "").slice(0, 4));
    } catch {
      /* private mode */
    }
    const tick = () => cloudSync && setStatus(cloudSync.getSyncStatus());
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, []);

  const toggleSync = async () => {
    if (!cloudSync) return;
    setBusy(true);
    try {
      if (status?.isEnabled) await cloudSync.disableSync();
      else await cloudSync.enableSync();
      setStatus(cloudSync.getSyncStatus());
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async () => {
    if (!syncManager || !status?.isEnabled) return;
    setBusy(true);
    try {
      await syncManager.triggerManualSync("Manual sync from settings");
      if (cloudSync) setStatus(cloudSync.getSyncStatus());
    } finally {
      setBusy(false);
    }
  };

  const deleteCloud = async () => {
    if (!cloudSync) return;
    if (
      !window.confirm(
        "Delete your synced data from the cloud? Your rounds on this device stay put.",
      )
    )
      return;
    setBusy(true);
    try {
      const ok = await cloudSync.deleteSyncedData();
      setStatus(cloudSync.getSyncStatus());
      window.alert(ok ? "Your cloud data was deleted." : "Couldn't delete — try again.");
    } finally {
      setBusy(false);
    }
  };

  const copyKey = async () => {
    if (!profileKey) return;
    try {
      await navigator.clipboard.writeText(profileKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the text is still select-all */
    }
  };

  const savePass = () => {
    const v = passInput.trim();
    try {
      if (v) localStorage.setItem("golf_buddy_pass", v);
      else localStorage.removeItem("golf_buddy_pass");
    } catch {
      /* private mode */
    }
    setPassSaved(true);
    setTimeout(() => setPassSaved(false), 2000);
  };

  const on = !!status?.isEnabled;

  return (
    <>
      <section className="px-5 pt-[26px]">
        <span className="bs-sect">Cloud sync</span>
        <div className="flex gap-[10px]">
          <Key
            variant={on ? "on" : "default"}
            onClick={() => !on && toggleSync()}
            disabled={busy}
            className="h-[60px] flex-1 text-[17px]"
          >
            On
          </Key>
          <Key
            variant={!on ? "on" : "default"}
            onClick={() => on && toggleSync()}
            disabled={busy}
            className="h-[60px] flex-1 text-[17px]"
          >
            Off
          </Key>
        </div>

        {on && (
          <>
            <div className="mt-[14px] flex flex-col gap-[9px]">
              <Row label="Status" value={status?.isSyncing ? "syncing…" : status?.lastError ? "error" : "active"} />
              <Row label="Last sync" value={rel(status?.lastSync)} />
              {status?.lastError && <Row label="Last error" value={status.lastError} />}
              {deviceId && <Row label="This device" value={deviceId} />}
            </div>
            <Key
              onClick={syncNow}
              disabled={busy || status?.isSyncing}
              className="mt-[14px] h-[60px] w-full text-[17px]"
            >
              {busy || status?.isSyncing ? "Syncing…" : "Sync now"}
            </Key>
            <Key
              onClick={deleteCloud}
              disabled={busy}
              className="mt-[10px] h-[52px] w-full text-[15px]"
            >
              Delete my cloud data
            </Key>
          </>
        )}
      </section>

      {passEnabled && (
        <section className="px-5 pt-[26px]">
          <span className="bs-sect">Golf Buddy Pass</span>
          <p className="bs-note mb-[10px]">
            Paste the pass key from your purchase to unlock cloud sync across
            devices.{" "}
            <a
              href="https://yourbuddy.golf/#pricing"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Get the Pass
            </a>
            .
          </p>
          <div className="flex gap-[10px]">
            <input
              type="text"
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
              placeholder="pass key"
              className="bs-box h-[52px] flex-1 px-3 font-sans text-[14px] outline-none"
              style={{ caretColor: "var(--color-cyan)" }}
            />
            <Key onClick={savePass} className="h-[52px] w-24 text-[15px]">
              {passSaved ? "Saved" : "Save"}
            </Key>
          </div>
        </section>
      )}

      {profileKey && (
        <section className="px-5 pt-[26px]">
          <span className="bs-sect">Move to a new phone</span>
          <p className="bs-note mb-[12px]">
            Your profile key is the only way back to these rounds. Write it down
            somewhere real — there&apos;s no login to fall back on.
          </p>
          <div className="bs-box select-all break-all p-[14px] font-sans text-[16px] font-semibold leading-[1.5] tracking-[0.04em]">
            {grouped(profileKey)}
          </div>
          <Key onClick={copyKey} className="mt-[10px] h-[52px] w-full text-[15px]">
            {copied ? "Copied" : "Copy key"}
          </Key>
        </section>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="bs-rail">{label}</span>
      <span className="bs-note text-right text-[14px]">{value}</span>
    </div>
  );
}
