"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { profileDB } from "@/lib/profile-db";

export default function ProfileRegistration() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [dob, setDob] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    // Check if user already has a profile
    checkExistingProfile();
  }, []);

  const checkExistingProfile = async () => {
    if (!profileDB) return;

    try {
      const profiles = await profileDB.getAllProfiles();
      if (profiles.length > 0) {
        setHasProfile(true);
        // Store the profile ID in localStorage for easy access
        localStorage.setItem("golf_buddy_profile_id", profiles[0].id);
        localStorage.setItem("golf_buddy_username", profiles[0].username);
      }
    } catch (error) {
      console.error("Error checking existing profile:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !dob) {
      setError("Please fill in all fields");
      return;
    }

    if (!profileDB) {
      setError("Profile database not available");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const profile = await profileDB.createProfile({
        username: username.trim(),
        dob,
      });

      // Store profile info in localStorage
      localStorage.setItem("golf_buddy_profile_id", profile.id);
      localStorage.setItem("golf_buddy_username", profile.username);

      // Redirect to games page
      router.push("/games");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create profile"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (hasProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-amber-50">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-xl shadow-lg border-2 border-amber-200 p-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">
              Welcome Back!
            </h1>
            <p className="text-slate-600 mb-6">
              You already have a profile set up. Ready to play some golf?
            </p>
            <button
              onClick={() => router.push("/games")}
              className="w-full bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Go to Games
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-amber-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg border-2 border-amber-200 p-8">
          <h1 className="text-2xl font-bold text-slate-800 text-center mb-6">
            Welcome to Golf Buddy!
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border-2 border-amber-200 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="Enter your username"
                required
                maxLength={20}
              />
            </div>

            <div>
              <label
                htmlFor="dob"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Date of Birth
              </label>
              <input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-4 py-3 border-2 border-amber-200 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Your date of birth is stored securely and hashed for privacy.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating Profile..." : "Create Profile"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              This creates a local profile on your device. No data is sent to
              any server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
