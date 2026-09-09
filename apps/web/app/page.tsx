"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { profileDB } from "@/lib/profile-db";
import ScreenHeader from "@/components/broadsheet/ScreenHeader";
import Key from "@/components/broadsheet/Key";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      if (!profileDB) {
        setIsLoading(false);
        return;
      }
      try {
        const profiles = await profileDB.getAllProfiles();
        if (profiles.length > 0) {
          setHasProfile(true);
          localStorage.setItem("golf_buddy_profile_id", profiles[0].id);
          localStorage.setItem("golf_buddy_username", profiles[0].username);
          router.push("/games");
        }
      } catch (e) {
        console.error("Error checking existing profile:", e);
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <>
        <ScreenHeader label="Your Golf Buddy" status="Loading" />
        <p className="bs-note px-5 pt-6">Loading…</p>
      </>
    );
  }
  if (hasProfile) return null;

  return (
    <div className="mx-auto w-full max-w-[430px]">
      <ScreenHeader label="Your Golf Buddy" status="On this device" />
      <div className="px-5 pt-[22px]">
        <h1 className="text-[42px] leading-[0.92]">
          Track every round.
          <br />
          Keep every note.
        </h1>
        <p className="bs-note mt-[10px]">
          A scorecard you actually want to pull out on the course. Set up a
          profile to start — it lives on this device, nothing is sent anywhere.
        </p>
      </div>
      <div className="mt-[26px] border-t-4 border-[var(--bs-ink)] px-5 pt-4">
        <Key
          href="/profile-registration"
          variant="ink"
          className="h-[66px] w-full text-[18px]"
        >
          Set up your profile →
        </Key>
      </div>
    </div>
  );
}
