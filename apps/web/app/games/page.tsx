"use client";

import { useCallback, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { db } from "../../lib/db";
import GamesList from "@/components/GamesList";
import NewCourseForm from "@/components/NewCourseForm";
import ScreenHeader from "@/components/broadsheet/ScreenHeader";
import Key from "@/components/broadsheet/Key";
import GlareChip from "@/components/GlareChip";

const queryClient = new QueryClient();

function GamesContent() {
  const [showForm, setShowForm] = useState(false);
  const [hasGames, setHasGames] = useState<boolean | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setHasProfile(!!localStorage.getItem("golf_buddy_profile_id"));
    } catch {
      setHasProfile(false);
    }
  }, []);

  const checkGames = useCallback(async () => {
    try {
      setHasGames(db ? (await db.games.count()) > 0 : false);
    } catch {
      setHasGames(false);
    }
  }, []);

  useEffect(() => {
    if (hasProfile === false) {
      window.location.href = "/profile-registration";
      return;
    }
    if (hasProfile === true) void checkGames();
  }, [hasProfile, checkGames]);

  if (hasProfile == null || hasGames == null) {
    return (
      <>
        <ScreenHeader label="Your Golf Buddy" status="Loading" />
        <p className="bs-note px-5 pt-6">Checking your rounds…</p>
      </>
    );
  }

  if (showForm || !hasGames) {
    return <NewCourseForm onCancel={hasGames ? () => setShowForm(false) : undefined} />;
  }

  return (
    <div className="mx-auto w-full max-w-[430px]">
      <ScreenHeader label="Your Golf Buddy" status="On this device" />

      <div className="flex items-end justify-between px-5 pt-[22px]">
        <h1 className="text-[42px] leading-[0.92]">Your rounds</h1>
        <GlareChip />
      </div>

      <GamesList />

      <div className="mt-[26px] border-t-4 border-[var(--bs-ink)] px-5 pb-5 pt-4">
        <Key
          variant="ink"
          onClick={() => setShowForm(true)}
          className="h-[66px] w-full text-[18px]"
        >
          New round
        </Key>
      </div>
    </div>
  );
}

export default function Games() {
  return (
    <QueryClientProvider client={queryClient}>
      <GamesContent />
    </QueryClientProvider>
  );
}
