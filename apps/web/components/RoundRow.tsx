"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface Round {
  id: number;
  courseId: number;
  dateLabel: string;
  scoreLine: string; // "In progress · thru 6" | "18 holes" | "18 holes · best here"
  score: number;
  inProgress: boolean;
  delta: string | null; // "+4" for in-progress rounds
}

const REVEAL = 96;

/**
 * A rounds-list row. Tap to open the round; swipe left to reveal a full-height
 * Delete key (replaces the old 48px bin icon — too small and too close to the
 * open target for a gloved thumb on a destructive action).
 */
export default function RoundRow({
  round,
  onDelete,
}: {
  round: Round;
  onDelete: (id: number) => void;
}) {
  const router = useRouter();
  const [dx, setDx] = useState(0); // 0 = closed, -REVEAL = open
  const start = useRef<{ x: number; base: number } | null>(null);
  const moved = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, base: dx };
    moved.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const next = Math.min(0, Math.max(-REVEAL, start.current.base + (e.clientX - start.current.x)));
    if (Math.abs(next - start.current.base) > 4) moved.current = true;
    setDx(next);
  };
  const onPointerUp = () => {
    if (start.current) setDx(dx < -REVEAL / 2 ? -REVEAL : 0);
    start.current = null;
  };

  const open = () => {
    if (moved.current || dx !== 0) {
      setDx(0);
      return;
    }
    router.push(`/game?courseId=${round.courseId}`);
  };

  const confirmDelete = () => {
    if (window.confirm("Delete this round? This can't be undone.")) {
      onDelete(round.id);
    } else {
      setDx(0);
    }
  };

  return (
    <div className="relative overflow-hidden">
      <button
        onClick={confirmDelete}
        className="bs-key bs-key-ink absolute right-0 top-0 h-full text-[15px]"
        style={{ width: REVEAL }}
        tabIndex={dx === 0 ? -1 : 0}
        aria-hidden={dx === 0}
      >
        Delete
      </button>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          transform: `translateX(${dx}px)`,
          transition: start.current ? "none" : "transform 160ms ease-out",
          touchAction: "pan-y",
        }}
        className="relative"
      >
        <button
          onClick={open}
          className="bs-key h-[78px] w-full justify-between px-4 font-normal"
        >
          <span className="text-left">
            <span className="block font-serif text-[19px] font-semibold leading-[1.2]">
              {round.dateLabel}
            </span>
            <span className="bs-rail mt-[7px] block">{round.scoreLine}</span>
          </span>
          <span className="flex items-center gap-[10px]">
            <span className="font-serif text-[26px] font-semibold leading-none">
              {round.score}
            </span>
            {round.inProgress && round.delta && (
              <span className="bs-flag">{round.delta}</span>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
