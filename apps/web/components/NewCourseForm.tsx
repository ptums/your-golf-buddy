"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "../lib/db";
import { useCourseSearch } from "../lib/use-course-search";
import ScreenHeader from "./broadsheet/ScreenHeader";
import Key from "./broadsheet/Key";

export default function NewCourseForm({ onCancel }: { onCancel?: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const justPicked = useRef(false);

  const [courseName, setCourseName] = useState("");
  const [holes, setHoles] = useState<9 | 18 | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);

  const { results, loading } = useCourseSearch(justPicked.current ? "" : courseName);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const typed = courseName.trim();
  const suggestionsVisible =
    showSuggestions && !justPicked.current && typed.length >= 2;

  const pick = (name: string) => {
    justPicked.current = true;
    setCourseName(name);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const teeOff = async () => {
    if (!typed || saving || !db) return;
    setSaving(true);
    let profileId: string | null = null;
    try {
      profileId = localStorage.getItem("golf_buddy_profile_id");
    } catch {
      /* private mode */
    }
    if (!profileId) {
      window.location.href = "/profile-registration";
      return;
    }
    const courseId = await db.courses.add({
      name: typed,
      rounds: holes ?? 18,
      profileId,
    });
    router.push(`/game?courseId=${courseId}`);
  };

  const cancel = () => (onCancel ? onCancel() : router.push("/games"));

  return (
    <div className="mx-auto w-full max-w-[430px]">
      <ScreenHeader label="New round" status="Type it in" />

      <div className="px-5 pt-[22px]">
        <h1 className="text-[42px] leading-[0.92]">
          Where are
          <br />
          you playing?
        </h1>
      </div>

      <section className="px-5 pt-[22px]">
        <span className="bs-sect">Course</span>
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          value={courseName}
          onChange={(e) => {
            justPicked.current = false;
            setCourseName(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          className="bs-box h-[60px] w-full px-[14px] font-sans text-[21px] font-semibold outline-none"
          style={{ caretColor: "var(--color-cyan)" }}
        />

        {suggestionsVisible && (results.length > 0 || loading || typed.length >= 2) && (
          <div className="mt-[10px] flex flex-col gap-[10px]">
            {results.slice(0, 4).map((r) => (
              <button
                key={r.placeId}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r.name)}
                className="bs-key h-14 justify-start px-[14px] text-[17px] font-normal"
              >
                {r.name}
                {typeof r.distanceKm === "number" && (
                  <span className="bs-rail ml-2">· {r.distanceKm} km</span>
                )}
              </button>
            ))}
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(typed)}
              className="bs-key bs-key-quiet h-14 justify-start border-dashed px-[14px] text-[17px] font-normal"
            >
              Use “{typed}” as typed
            </button>
          </div>
        )}

        <p className="bs-note mt-3">
          No signal? Suggestions vanish, the field stays. You never wait on the
          network to tee off.
        </p>
      </section>

      <section className="px-5 pt-6">
        <span className="bs-sect">Holes</span>
        <div className="flex gap-[10px]">
          {([9, 18] as const).map((n) => (
            <Key
              key={n}
              variant={holes === n ? "on" : "default"}
              onClick={() => setHoles(n)}
              className="h-[76px] flex-1 text-[26px]"
              aria-pressed={holes === n}
            >
              {n}
            </Key>
          ))}
        </div>
      </section>

      <div className="mt-7 flex gap-[10px] border-t-4 border-[var(--bs-ink)] px-5 pb-3 pt-4">
        <Key onClick={cancel} className="h-[66px] w-24 text-[16px]">
          Cancel
        </Key>
        <Key
          variant="ink"
          onClick={teeOff}
          disabled={!typed || saving}
          className="h-[66px] flex-1 text-[18px]"
        >
          {saving ? "Starting…" : "First tee →"}
        </Key>
      </div>

      <p className="px-5 pb-6 text-center">
        <Link
          href="/how-to"
          className="bs-rail underline underline-offset-2"
          style={{ color: "var(--color-n800)" }}
        >
          How to use Your Golf Buddy
        </Link>
      </p>
    </div>
  );
}
