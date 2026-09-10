"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { profileDB } from "@/lib/profile-db";
import { cloudSync, extractProfileKey } from "@/lib/cloud-sync";
import ScreenHeader from "@/components/broadsheet/ScreenHeader";
import Key from "@/components/broadsheet/Key";

export default function ProfileRegistration() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [dob, setDob] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasProfile, setHasProfile] = useState(false);

  const [showRestore, setShowRestore] = useState(false);
  const [restoreKey, setRestoreKey] = useState("");
  const [restoreError, setRestoreError] = useState("");

  useEffect(() => {
    (async () => {
      if (!profileDB) return;
      try {
        const profiles = await profileDB.getAllProfiles();
        if (profiles.length > 0) {
          setHasProfile(true);
          localStorage.setItem("golf_buddy_profile_id", profiles[0].id);
          localStorage.setItem("golf_buddy_username", profiles[0].username);
        }
      } catch (e) {
        console.error("Error checking existing profile:", e);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !dob) {
      setError("Add a username and your date of birth.");
      return;
    }
    if (!profileDB) {
      setError("Profile storage isn't available.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const profile = await profileDB.createProfile({ username: username.trim(), dob });
      localStorage.setItem("golf_buddy_profile_id", profile.id);
      localStorage.setItem("golf_buddy_username", profile.username);
      router.push("/games");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create your profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    setRestoreError("");
    if (!extractProfileKey(restoreKey)) {
      setRestoreError("That doesn't look like a profile key.");
      return;
    }
    if (!cloudSync) {
      setRestoreError("Sync isn't available right now.");
      return;
    }
    setIsLoading(true);
    try {
      const name = await cloudSync.restoreProfile(restoreKey);
      if (name) router.push("/games");
      else setRestoreError("No data found for that key. Check it and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (hasProfile) {
    return (
      <div className="mx-auto w-full max-w-[430px]">
        <ScreenHeader label="Your Golf Buddy" status="On this device" />
        <div className="px-5 pt-[22px]">
          <h1 className="text-[42px] leading-[0.92]">Welcome back</h1>
          <p className="bs-note mt-[10px]">Your profile is already set up here.</p>
        </div>
        <div className="mt-[26px] border-t-4 border-[var(--bs-ink)] px-5 pt-4">
          <Key
            variant="ink"
            onClick={() => router.push("/games")}
            className="h-[66px] w-full text-[18px]"
          >
            Your rounds →
          </Key>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[430px]">
      <ScreenHeader label="Your Golf Buddy" status="Setting up" />

      <div className="px-5 pt-[22px]">
        <h1 className="text-[42px] leading-[0.92]">
          Set up your
          <br />
          profile
        </h1>
        <p className="bs-note mt-[10px]">
          A username and your date of birth — that&apos;s it. No email, no
          password. It just labels the data on this device.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <section className="px-5 pt-[22px]">
          <label htmlFor="username" className="bs-sect">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bs-box h-[56px] w-full px-[14px] font-sans text-[18px] outline-none"
            style={{ caretColor: "var(--color-cyan)" }}
            maxLength={20}
            required
          />
        </section>

        <section className="px-5 pt-[22px]">
          <label htmlFor="dob" className="bs-sect">
            Date of birth
          </label>
          <input
            id="dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="bs-box h-[56px] w-full px-[14px] font-sans text-[18px] outline-none"
            required
          />
          <p className="bs-note mt-[6px] text-[13px]">Hashed on this device for privacy.</p>
        </section>

        {error && (
          <p className="bs-note px-5 pt-3" style={{ color: "var(--bs-state)" }}>
            {error}
          </p>
        )}

        <div className="mt-[26px] border-t-4 border-[var(--bs-ink)] px-5 pt-4">
          <Key
            type="submit"
            variant="ink"
            disabled={isLoading}
            className="h-[66px] w-full text-[18px]"
          >
            {isLoading ? "Creating…" : "Create profile →"}
          </Key>
        </div>
      </form>

      <section className="px-5 pt-[22px]">
        {!showRestore ? (
          <button
            type="button"
            onClick={() => setShowRestore(true)}
            className="bs-rail underline underline-offset-2"
            style={{ color: "var(--color-n800)" }}
          >
            Already use Your Golf Buddy? Restore with your profile key
          </button>
        ) : (
          <form onSubmit={handleRestore}>
            <span className="bs-sect">Profile key</span>
            <input
              type="text"
              autoComplete="off"
              value={restoreKey}
              onChange={(e) => setRestoreKey(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="bs-box h-[52px] w-full px-3 font-sans text-[14px] outline-none"
              style={{ caretColor: "var(--color-cyan)" }}
            />
            <p className="bs-note mt-[6px] text-[13px]">
              Find it under Settings → Move to a new phone, on your other device.
            </p>
            {restoreError && (
              <p className="bs-note mt-2" style={{ color: "var(--bs-state)" }}>
                {restoreError}
              </p>
            )}
            <div className="mt-3 flex gap-[10px]">
              <Key
                type="submit"
                variant="ink"
                disabled={isLoading}
                className="h-[56px] flex-1 text-[16px]"
              >
                {isLoading ? "Restoring…" : "Restore"}
              </Key>
              <Key
                type="button"
                onClick={() => {
                  setShowRestore(false);
                  setRestoreError("");
                }}
                className="h-[56px] w-24 text-[15px]"
              >
                Cancel
              </Key>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
