"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "../lib/db";
import { useCourseSearch } from "../lib/use-course-search";

export default function NewCourseForm() {
  const router = useRouter();

  // form state
  const [courseName, setCourseName] = useState("");
  const [selectedRounds, setSelectedRounds] = useState<9 | 18 | null>(null);

  // typeahead state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const justPickedRef = useRef(false);
  const { results, loading, enabled } = useCourseSearch(
    justPickedRef.current ? "" : courseName,
  );

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

  const onChangeName = (value: string) => {
    justPickedRef.current = false;
    setCourseName(value);
    setShowSuggestions(true);
  };

  const onPickSuggestion = (name: string) => {
    justPickedRef.current = true;
    setCourseName(name);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const suggestionsVisible =
    enabled && showSuggestions && !justPickedRef.current && results.length > 0;

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
        <div className="relative w-full max-w-md mb-6">
          <input
            id="course"
            ref={inputRef}
            type="text"
            autoComplete="off"
            value={courseName}
            onChange={(e) => onChangeName(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // let a click on a suggestion register first
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            className="w-full bg-white p-3 border-2 rounded font-sans focus:outline-none focus:border-yellow-500 text-cyan-900 font-semibold"
          />

          {suggestionsVisible && (
            <ul className="absolute z-10 mt-1 w-full bg-white border-2 border-amber-200 rounded shadow-lg max-h-64 overflow-auto">
              {results.map((r) => (
                <li key={r.placeId}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onPickSuggestion(r.name)}
                    className="w-full text-left px-3 py-2 hover:bg-amber-50 focus:bg-amber-50 focus:outline-none cursor-pointer"
                  >
                    <span className="block font-semibold text-slate-800">
                      {r.name}
                    </span>
                    {r.address && (
                      <span className="block text-xs text-slate-500">
                        {r.address}
                        {typeof r.distanceKm === "number" &&
                          ` · ${r.distanceKm} km`}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {enabled && loading && courseName.trim().length >= 2 && (
            <span className="absolute right-3 top-3 text-xs text-slate-400">
              searching…
            </span>
          )}
        </div>

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
