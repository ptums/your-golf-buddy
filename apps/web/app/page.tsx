"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { profileDB } from "@/lib/profile-db";
import Link from "next/link";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkExistingProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkExistingProfile = async () => {
    if (!profileDB) {
      setIsLoading(false);
      return;
    }

    try {
      const profiles = await profileDB.getAllProfiles();
      if (profiles.length > 0) {
        setHasProfile(true);
        // Store the profile ID in localStorage for easy access
        localStorage.setItem("golf_buddy_profile_id", profiles[0].id);
        localStorage.setItem("golf_buddy_username", profiles[0].username);
        // Redirect to games page
        router.push("/games");
      }
    } catch (error) {
      console.error("Error checking existing profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (hasProfile) {
    return null; // Will redirect to games
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-amber-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg border-2 border-amber-200 p-8">
          <h1 className="text-2xl font-bold text-slate-800 text-center mb-6">
            Welcome to Golf Buddy!
          </h1>

          <p className="text-slate-600 text-center mb-6">
            Let&apos;s set up your profile to start tracking your golf games.
          </p>

          <div className="space-y-4">
            <div className="text-center">
              <Link
                href="/profile-registration"
                className="inline-block w-full bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Create Profile
              </Link>
            </div>

            <div className="text-center">
              <p className="text-sm text-slate-500">
                This creates a local profile on your device. No data is sent to
                any server.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
