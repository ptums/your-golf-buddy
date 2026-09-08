"use client";
import GamesList from "@/components/GamesList";
import NewCourseForm from "@/components/NewCourseForm";
import { useState, useEffect, useCallback } from "react";
import { db } from "../../lib/db";
import BottomSheet from "@/components/BottomSheet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function GamesContent() {
  const [showForm, setShowForm] = useState(false);
  const [hasExistingGames, setHasExistingGames] = useState<boolean | null>(
    null
  );
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  const getExistingGames = useCallback(async () => {
    try {
      if (!db) {
        setHasExistingGames(false);
        return;
      }

      const gamesCount = await db.games.count();
      setHasExistingGames(gamesCount > 0);
    } catch (error) {
      console.error("Error checking existing games:", error);
      // If there's an error, assume no games exist and show the form
      setHasExistingGames(false);
    }
  }, []);

  // Check if user has a profile first
  useEffect(() => {
    const checkProfile = () => {
      const profileId = localStorage.getItem("golf_buddy_profile_id");

      if (!profileId) {
        setHasProfile(false);
        return;
      }
      setHasProfile(true);
    };

    checkProfile();
  }, []);

  // Check if there are existing games (only after profile check)
  useEffect(() => {
    if (hasProfile === false) {
      // No profile, redirect to profile registration
      window.location.href = "/profile-registration";
      return;
    }

    if (hasProfile !== true) {
      // Still checking profile
      return;
    }

    getExistingGames(); // Only depend on hasProfile, not hasExistingGames
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasProfile]); // Only depend on hasProfile, not hasExistingGames

  // Show loading while checking data
  if (hasProfile === null || hasExistingGames === null) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-4">
            {hasProfile === null
              ? "Checking profile..."
              : "Checking your golf games..."}
          </p>
          {hasProfile === null && (
            <button
              onClick={() => setHasProfile(false)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Skip Loading
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Show form for new players or when explicitly requested */}
      {showForm || !hasExistingGames ? (
        <div>
          <NewCourseForm />
        </div>
      ) : (
        <div className="relative min-h-screen bg-amber-50">
          <GamesList />
          <BottomSheet
            label="New Game"
            handleCallback={() => setShowForm(true)}
            position="fixed bottom-0 left-0 bg-white/80 border-t-2 border-amber-200"
            colorClasses="bg-orange-600 active:bg-orange-500 text-white font-semibold"
          />
        </div>
      )}
    </>
  );
}

export default function Games() {
  return (
    <QueryClientProvider client={queryClient}>
      <GamesContent />
    </QueryClientProvider>
  );
}
