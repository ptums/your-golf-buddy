"use client";

import { useState } from "react";
import Link from "next/link";
import clubDrillsData from "@/lib/practice-drills.json";
import ScreenHeader from "@/components/broadsheet/ScreenHeader";
import Key from "@/components/broadsheet/Key";

interface Drill {
  name: string;
  description: string;
  focus: string;
  recommendedReps: string;
  difficulty: string;
}
interface ClubDrill {
  club: string;
  drills: Drill[];
}

const clubDrills: ClubDrill[] = clubDrillsData.clubDrills;

function DrillCard({ drill, defaultOpen }: { drill: Drill; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bs-box p-4">
      <div className="flex items-center justify-between">
        <span className="bs-rail bs-rail-ink">{drill.focus}</span>
        <span className="bs-flag">{drill.difficulty}</span>
      </div>
      <h2 className="mb-[6px] mt-[10px] text-[23px]">{drill.name}</h2>
      <p className="bs-note mb-[14px]">{drill.description}</p>
      {open && (
        <p className="bs-note mb-[14px] text-[13px]">
          <span className="bs-rail bs-rail-ink">Reps</span> — {drill.recommendedReps}
        </p>
      )}
      <Key
        variant={open ? "ink" : "default"}
        onClick={() => setOpen((v) => !v)}
        className="h-[52px] w-full text-[16px]"
      >
        {open ? "Done" : "Start drill"}
      </Key>
    </div>
  );
}

export default function PracticeDrills() {
  const [club, setClub] = useState<ClubDrill | null>(null);

  return (
    <div className="mx-auto w-full max-w-[430px]">
      <ScreenHeader label="Practice drills" status="Works offline" />

      <div className="px-5 pt-[22px]">
        <h1 className="text-[42px] leading-[0.92]">
          {club ? (
            club.club
          ) : (
            <>
              Range
              <br />
              session
            </>
          )}
        </h1>
        <p className="bs-note mt-[10px] italic" style={{ color: "var(--color-n800)" }}>
          {club
            ? `${club.drills.length} drills. Work one until it's boring, then move on.`
            : "Pick a club. Three drills, in order, no bucket of hero shots."}
        </p>
      </div>

      <div className="pt-[18px]">
        <div className="flex gap-[8px] overflow-x-auto px-5 pb-1">
          {clubDrills.map((c) => (
            <Key
              key={c.club}
              variant={club?.club === c.club ? "on" : "default"}
              onClick={() => {
                setClub(c);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="h-[52px] flex-none px-4 text-[15px]"
              aria-pressed={club?.club === c.club}
            >
              {c.club}
            </Key>
          ))}
        </div>
      </div>

      {club && (
        <div className="flex flex-col gap-[12px] px-5 pt-6">
          {club.drills.map((d, i) => (
            <DrillCard key={d.name} drill={d} defaultOpen={i === 0} />
          ))}
        </div>
      )}

      <div className="mt-[26px] border-t-4 border-[var(--bs-ink)] px-5 pb-5 pt-4">
        <Link
          href="/swing-tips"
          className="bs-key h-[60px] w-full text-[16px] no-underline"
        >
          {club ? `Swing tips for ${club.club}` : "Swing tips"}
        </Link>
      </div>
    </div>
  );
}
