"use client";

import { useState } from "react";
import Link from "next/link";
import SwingTipsData from "@/lib/swing-tips.json";
import ScreenHeader from "@/components/broadsheet/ScreenHeader";
import Key from "@/components/broadsheet/Key";

interface Positions {
  numerOfPositions: number[];
  position: number | number[];
}
interface LieAdjustment {
  target: string;
  grip?: { numerOfPositions: number[]; position: number[] };
  swing: string;
}
interface SwingTip {
  club: string;
  ballPosition: Positions;
  stanceWidth: Positions & { note?: string };
  weightDistribution: Positions;
  lieAdjustments: Record<string, LieAdjustment>;
}

const tips = SwingTipsData as unknown as SwingTip[];

const asArray = (p: number | number[]) => (Array.isArray(p) ? p : [p]);
const titleCase = (k: string) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();

function PositionRow({ label, data }: { label: string; data: Positions & { note?: string } }) {
  const selected = new Set(asArray(data.position));
  return (
    <div>
      <span className="bs-rail bs-rail-ink mb-[6px] block">{label}</span>
      <div className="flex gap-[6px]">
        {data.numerOfPositions.map((n) => (
          <span
            key={n}
            className={`bs-key h-9 min-h-0 flex-1 text-[13px] ${
              selected.has(n) ? "bs-key-on" : ""
            }`}
          >
            {n}
          </span>
        ))}
      </div>
      {data.note && <p className="bs-note mt-[6px] text-[13px]">{data.note}</p>}
    </div>
  );
}

export default function SwingTips() {
  const [club, setClub] = useState<SwingTip | null>(null);

  return (
    <div className="mx-auto w-full max-w-[430px]">
      <ScreenHeader label="Swing tips" status="Works offline" />

      <div className="px-5 pt-[22px]">
        <h1 className="text-[42px] leading-[0.92]">{club ? club.club : "Swing tips"}</h1>
        <p className="bs-note mt-[10px] italic" style={{ color: "var(--color-n800)" }}>
          {club
            ? "Where the ball sits, how wide you stand, where your weight goes."
            : "Pick a club for its setup and the common fixes."}
        </p>
      </div>

      {/* Club rail */}
      <div className="pt-[18px]">
        <div className="flex gap-[8px] overflow-x-auto px-5 pb-1">
          {tips.map((t) => (
            <Key
              key={t.club}
              variant={club?.club === t.club ? "on" : "default"}
              onClick={() => {
                setClub(t);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="h-[52px] flex-none px-4 text-[15px]"
              aria-pressed={club?.club === t.club}
            >
              {t.club}
            </Key>
          ))}
        </div>
      </div>

      {club && (
        <>
          <section className="px-5 pt-[26px]">
            <span className="bs-sect">Setup</span>
            <div className="flex flex-col gap-4">
              <PositionRow label="Ball position" data={club.ballPosition} />
              <PositionRow label="Stance width" data={club.stanceWidth} />
              <PositionRow label="Weight" data={club.weightDistribution} />
            </div>
          </section>

          {Object.entries(club.lieAdjustments).map(([lie, adj]) => (
            <section key={lie} className="px-5 pt-[26px]">
              <span className="bs-sect">From the {titleCase(lie).toLowerCase()}</span>
              <p className="bs-note">
                <span className="bs-rail bs-rail-ink">Target</span> — {adj.target}
              </p>
              <p className="bs-note mt-2">
                <span className="bs-rail bs-rail-ink">Swing</span> — {adj.swing}
              </p>
              {adj.grip && (
                <div className="mt-3">
                  <span className="bs-rail bs-rail-ink mb-[6px] block">Grip</span>
                  <div className="flex gap-[6px]">
                    {adj.grip.numerOfPositions.map((n) => (
                      <span
                        key={n}
                        className={`bs-key h-9 min-h-0 flex-1 text-[13px] ${
                          adj.grip!.position.includes(n) ? "bs-key-on" : ""
                        }`}
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ))}
        </>
      )}

      <div className="mt-[26px] flex gap-[10px] border-t-4 border-[var(--bs-ink)] px-5 pb-5 pt-4">
        <Key href="/practice-drills" className="h-[60px] flex-1 text-[16px]">
          {club ? `Drills for ${club.club}` : "Practice drills"}
        </Key>
        <Link
          href="/practice-drills"
          className="bs-key h-[60px] w-[60px] flex-none text-[20px] no-underline"
          aria-label="Go to practice drills"
        >
          →
        </Link>
      </div>
    </div>
  );
}
