"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "../lib/db";

export default function NewCourseForm() {
  const router = useRouter();

  // form state
  const [courseName, setCourseName] = useState("");
  const [selectedRounds, setSelectedRounds] = useState<9 | 18 | null>(null);

  // ref to auto‑focus
  const inputRef = useRef<HTMLInputElement>(null);

  // focus the course input on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      inputRef.current?.focus();
    }
  }, []);

  // when both name + rounds are set, wait 1.5s then save & redirect
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (selectedRounds !== null && courseName.trim() !== "") {
      const handle = setTimeout(async () => {
        if (!db) {
          console.error("Database not available");
          return;
        }

        // Create the Course record
        const profileId = localStorage.getItem("golf_buddy_profile_id");
        if (!profileId) {
          console.error(
            "No profile ID found - redirecting to profile registration"
          );
          window.location.href = "/profile-registration";
          return;
        }

        const courseId = await db.courses.add({
          name: courseName.trim(),
          rounds: selectedRounds,
          profileId,
        });

        // Redirect to the game page
        router.push(`/game?courseId=${courseId}`);
      }, 1500);

      return () => {
        if (typeof window !== "undefined") {
          clearTimeout(handle);
        }
      };
    }
  }, [selectedRounds, courseName, router]);

  // button handler
  const onRoundsClick = (r: 9 | 18) => {
    setSelectedRounds(r);
  };

  // no games → show "Add new course" form
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col">
        <label
          htmlFor="course"
          className=" font-sans text-lg w-full text-left font-bold"
        >
          Course
        </label>
        <input
          id="course"
          ref={inputRef}
          type="text"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          className="w-full bg-white max-w-md p-3 mb-6 border-2 rounded font-sans focus:outline-none focus:border-yellow-500 text-cyan-900 font-semibold"
        />

        <div className="flex space-x-4 justify-center">
          <button
            onClick={() => onRoundsClick(9)}
            disabled={!courseName.trim()}
            className="w-20 h-20 font-bold font-sans text-4xl bg-orange-500 rounded-full disabled:opacity-80 cursor-pointer
"
          >
            9
          </button>
          <button
            onClick={() => onRoundsClick(18)}
            disabled={!courseName.trim()}
            className="w-20 h-20 font-bold font-sans text-4xl bg-orange-500 rounded-full disabled:opacity-80 cursor-pointer
"
          >
            18
          </button>
        </div>
      </div>
    </div>
  );
}
