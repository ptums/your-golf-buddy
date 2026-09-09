"use client";

import { useEffect, useState } from "react";
import SyncSettings from "@/components/SyncSettings";
import ScreenHeader from "@/components/broadsheet/ScreenHeader";
import Key from "@/components/broadsheet/Key";
import { getGlareMode, setGlareMode, type GlareMode } from "@/lib/glare";
import { db } from "@/lib/db";

const GLARE_OPTIONS: GlareMode[] = ["on", "off", "auto"];

export default function Settings() {
  const [username, setUsername] = useState("");
  const [glare, setGlare] = useState<GlareMode>("off");

  useEffect(() => {
    try {
      setUsername(localStorage.getItem("golf_buddy_username") ?? "");
    } catch {
      /* private mode */
    }
    setGlare(getGlareMode());
  }, []);

  const pickGlare = (m: GlareMode) => {
    setGlareMode(m);
    setGlare(m);
  };

  const wipe = () => {
    if (
      !window.confirm(
        "Delete every round, course and note on this phone? If cloud sync is on elsewhere you can still restore with your profile key. This can't be undone here.",
      )
    )
      return;
    try {
      db?.close();
      indexedDB.deleteDatabase("ScoreCardNotes");
      indexedDB.deleteDatabase("GolfBuddyProfiles");
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith("golf_buddy_")) localStorage.removeItem(k);
      }
    } catch {
      /* best effort */
    }
    window.location.href = "/";
  };

  return (
    <div className="mx-auto w-full max-w-[430px]">
      <ScreenHeader label="Settings" status="On this device" />

      <div className="px-5 pt-[22px]">
        <h1 className="text-[42px] leading-[0.92]">Settings</h1>
        <p className="bs-note mt-[10px]">
          {username ? (
            <>
              You&apos;re <strong>{username}</strong>.{" "}
            </>
          ) : null}
          No email, no password — your rounds live on this phone.
        </p>
      </div>

      <section className="px-5 pt-[26px]">
        <span className="bs-sect">Glare mode</span>
        <div className="flex gap-[10px]">
          {GLARE_OPTIONS.map((m) => (
            <Key
              key={m}
              variant={glare === m ? "on" : "default"}
              onClick={() => pickGlare(m)}
              className="h-[60px] flex-1 text-[17px] capitalize"
              aria-pressed={glare === m}
            >
              {m}
            </Key>
          ))}
        </div>
        <p className="bs-note mt-[10px]">
          Bigger type, ink only, fewer taps. Auto follows your screen brightness.
        </p>
      </section>

      <SyncSettings />

      <div className="mt-[26px] border-t-4 border-[var(--bs-ink)] px-5 pb-6 pt-4">
        <Key
          variant="ink"
          onClick={wipe}
          className="h-[60px] w-full text-[17px]"
        >
          Delete everything on this phone
        </Key>
      </div>
    </div>
  );
}
