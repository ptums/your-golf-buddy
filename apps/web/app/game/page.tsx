"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db, type Game, type Score } from "@/lib/db";
import { syncManager } from "@/lib/sync-manager";
import ScreenHeader from "@/components/broadsheet/ScreenHeader";
import Key from "@/components/broadsheet/Key";
import {
  formatDelta,
  runningTotal,
  scoreName,
  scoreToPar,
  thruCount,
  type HoleEntry,
} from "@/lib/score";

const STROKE_KEYS = [1, 2, 3, 4, 5, 6, 7, 8] as const; // 8 = "8+"

function GameContent() {
  const router = useRouter();
  const courseId = useSearchParams().get("courseId");

  const [gameId, setGameId] = useState<number | null>(null);
  const [courseName, setCourseName] = useState("");
  const [entries, setEntries] = useState<HoleEntry[]>([]);
  const [current, setCurrent] = useState(0);
  const [cardOpen, setCardOpen] = useState(true);
  const [ready, setReady] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  // ── load course + game + scores ─────────────────────────────────────────
  useEffect(() => {
    if (!courseId || !db) return;
    let alive = true;

    (async () => {
      const course = await db.courses.get(Number(courseId));
      if (!course || !alive) return;
      setCourseName(course.name);

      const games = await db.games.where("courseId").equals(course.id!).sortBy("date");
      games.reverse();
      let g: Game | undefined = games[0];
      if (!g) {
        const id = await db.games.add({
          courseId: course.id!,
          date: new Date(),
          finalNote: "",
          finalScore: 0,
          scores: [],
        });
        g = await db.games.get(id);
      }
      if (!g || !alive) return;
      setGameId(g.id!);

      const holes = course.rounds ?? 18;
      const existing = await db.scores.where("gameId").equals(g.id!).toArray();
      const slots: HoleEntry[] = Array.from({ length: holes }, () => ({
        par: "",
        score: "",
        putts: null,
      }));
      for (const r of existing) {
        if (r.hole != null && r.hole >= 0 && r.hole < holes) {
          slots[r.hole] = {
            par: r.par ?? "",
            score: r.score ?? "",
            putts: r.putts ?? null,
          };
        }
      }
      if (!alive) return;
      setEntries(slots);

      // resume at the first hole with no stroke count, else the last hole
      const firstBlank = slots.findIndex((e) => !e.score);
      setCurrent(firstBlank === -1 ? holes - 1 : firstBlank);

      try {
        const stored = sessionStorage.getItem(`gb_card_${g.id}`);
        setCardOpen(stored == null ? true : stored === "1");
      } catch {
        /* private mode */
      }
      setReady(true);
    })();

    return () => {
      alive = false;
    };
  }, [courseId]);

  // keep the current hole in view in the strip
  useEffect(() => {
    if (!cardOpen) return;
    const el = stripRef.current?.querySelector<HTMLElement>(
      `[data-hole="${current}"]`,
    );
    el?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [current, cardOpen, ready]);

  const holes = entries.length;
  const entry: HoleEntry = entries[current] ?? { par: "", score: "", putts: null };

  const total = useMemo(() => runningTotal(entries), [entries]);
  const thru = useMemo(() => thruCount(entries), [entries]);
  const delta = useMemo(() => scoreToPar(entries), [entries]);
  const flag = scoreName(parseInt(entry.score, 10), parseInt(entry.par, 10));

  // ── persistence ─────────────────────────────────────────────────────────
  const upsert = useCallback(
    async (idx: number, partial: Partial<Pick<Score, "par" | "score" | "putts">>) => {
      if (gameId == null || !db) return;
      const row = await db.scores
        .where("gameId")
        .equals(gameId)
        .and((r) => r.hole === idx)
        .first();
      if (row?.id) {
        await db.scores.update(row.id, partial);
      } else {
        await db.scores.add({
          gameId,
          hole: idx,
          par: partial.par ?? "",
          score: partial.score ?? "",
          putts: partial.putts ?? 0,
        } as Score);
      }
    },
    [gameId],
  );

  const setField = useCallback(
    (field: keyof HoleEntry, value: string | number | null) => {
      setEntries((prev) => {
        const next = prev.map((e, i) => (i === current ? { ...e, [field]: value } : e));
        if (field === "score" && gameId != null && db) {
          void db.games.update(gameId, { finalScore: runningTotal(next) });
        }
        return next;
      });
      const stored =
        field === "putts" ? (value == null ? 0 : Number(value)) : String(value ?? "");
      void upsert(current, { [field]: stored } as Partial<Score>);
    },
    [current, gameId, upsert],
  );

  // toggle a single-select key: tapping the selected value clears it
  const toggle = (field: "par" | "score" | "putts", raw: number) => {
    if (field === "putts") {
      setField("putts", entry.putts === raw ? null : raw);
    } else {
      setField(field, entry[field] === String(raw) ? "" : String(raw));
    }
  };

  const toggleCard = () => {
    setCardOpen((v) => {
      const next = !v;
      try {
        if (gameId != null) sessionStorage.setItem(`gb_card_${gameId}`, next ? "1" : "0");
      } catch {
        /* private mode */
      }
      return next;
    });
  };

  const finish = async () => {
    if (gameId != null && db) {
      await db.games.update(gameId, { finalScore: total, completedAt: new Date() } as Partial<Game>);
    }
    try {
      await syncManager?.triggerGameCompletionSync();
    } catch {
      /* offline — sync-manager queues it */
    }
    router.push("/games");
  };

  if (!ready) {
    return (
      <>
        <ScreenHeader label={courseName || "Round"} status="Loading" />
        <p className="bs-note px-5 pt-6">Opening your round…</p>
      </>
    );
  }

  const onLastHole = current === holes - 1;

  return (
    <div className="mx-auto w-full max-w-[430px]">
      <ScreenHeader label={courseName} status="Saved · offline" />

      {/* Scorecard bar */}
      <div className="px-5 pt-[14px]">
        <button
          onClick={toggleCard}
          className="bs-key h-14 w-full justify-between px-4 text-[15px]"
          aria-expanded={cardOpen}
        >
          <span>Scorecard · thru {thru}</span>
          <span className="flex items-center gap-3">
            {total}
            {thru > 0 && (
              <span style={{ color: "var(--bs-state)" }}>{formatDelta(delta)}</span>
            )}
            <span className="text-[13px]">{cardOpen ? "▲" : "▼"}</span>
          </span>
        </button>
      </div>

      {/* Scorecard strip */}
      {cardOpen && (
        <div className="mb-[2px] border-b-[1.5px] border-[var(--bs-ink)] pt-4">
          <div className="flex pb-3">
            <div className="w-12 flex-none pl-5">
              <div className="flex h-[30px] items-center bs-rail">Hole</div>
              <div className="flex h-[28px] items-center bs-rail">Par</div>
              <div className="flex h-[46px] items-center bs-rail">You</div>
            </div>
            <div
              ref={stripRef}
              className="flex flex-1 gap-[2px] overflow-x-auto overscroll-x-contain"
            >
              {entries.map((e, i) => {
                const isCurrent = i === current;
                const beyond = i > Math.max(thru, current);
                const s = parseInt(e.score, 10);
                return (
                  <button
                    key={i}
                    data-hole={i}
                    onClick={() => setCurrent(i)}
                    className="w-12 flex-none text-center"
                    style={{ opacity: beyond ? 0.45 : 1 }}
                    aria-label={`Edit hole ${i + 1}`}
                  >
                    <div
                      className="flex h-[30px] items-center justify-center text-[13px]"
                      style={
                        isCurrent
                          ? { color: "var(--bs-state)", fontWeight: 600 }
                          : undefined
                      }
                    >
                      {i + 1}
                    </div>
                    <div
                      className="flex h-[28px] items-center justify-center text-[13px]"
                      style={{
                        color: isCurrent ? "var(--bs-state)" : "var(--color-n800)",
                      }}
                    >
                      {e.par || "·"}
                    </div>
                    <div
                      className="flex h-[46px] items-center justify-center font-serif text-[21px] font-semibold leading-none"
                      style={
                        isCurrent
                          ? {
                              background: "var(--bs-ink)",
                              color: "var(--bs-bg)",
                              boxShadow: "inset 0 3px 0 var(--bs-state)",
                            }
                          : s > 0
                            ? undefined
                            : { color: "var(--color-n500)" }
                      }
                    >
                      {s > 0 ? (
                        s
                      ) : isCurrent ? (
                        <span style={{ opacity: 0.55 }}>–</span>
                      ) : (
                        "·"
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="bs-note px-5 pb-3 text-[13px]">
            Scroll the card · tap any hole to edit it
          </div>
        </div>
      )}

      {/* Hole heading */}
      <div className="flex items-end justify-between px-5 pt-[18px]">
        <div>
          <h1 className="text-[46px] leading-[0.9] tracking-[-0.02em]">
            Hole {current + 1}
          </h1>
          <div className="bs-rail mt-[10px]">
            {entry.par ? `Par ${entry.par}` : "Par not set"}
          </div>
        </div>
        <div className="text-right">
          <div className="font-serif text-[46px] font-semibold leading-[0.9]">{total}</div>
          <div className="bs-rail mt-3">
            Thru {thru} ·{" "}
            <span style={{ color: "var(--bs-state)" }}>{formatDelta(delta)}</span>
          </div>
        </div>
      </div>

      {/* Par */}
      <section className="px-5 pt-5">
        <span className="bs-sect">Par</span>
        <div className="flex gap-[10px]">
          {[3, 4, 5].map((n) => (
            <Key
              key={n}
              variant={entry.par === String(n) ? "on" : "default"}
              onClick={() => toggle("par", n)}
              className="h-[60px] flex-1 text-[26px]"
              aria-pressed={entry.par === String(n)}
            >
              {n}
            </Key>
          ))}
        </div>
      </section>

      {/* Strokes */}
      <section className="px-5 pt-[22px]">
        <div className="mb-[10px] flex items-center justify-between">
          <span className="bs-sect mb-0">Strokes</span>
          {flag && <span className="bs-flag">{flag}</span>}
        </div>
        <div className="grid grid-cols-4 gap-[10px]">
          {STROKE_KEYS.map((n) => (
            <Key
              key={n}
              variant={entry.score === String(n) ? "on" : "default"}
              onClick={() => toggle("score", n)}
              className={`h-[70px] ${n === 8 ? "text-[22px]" : "text-[30px]"}`}
              aria-pressed={entry.score === String(n)}
            >
              {n === 8 ? "8+" : n}
            </Key>
          ))}
        </div>
      </section>

      {/* Putts */}
      <section className="px-5 pt-[22px]">
        <span className="bs-sect">Putts</span>
        <div className="flex gap-[10px]">
          {[1, 2, 3, 4, 5].map((n) => (
            <Key
              key={n}
              variant={entry.putts === n ? "on" : "default"}
              onClick={() => toggle("putts", n)}
              className="h-[58px] flex-1 text-[24px]"
              aria-pressed={entry.putts === n}
            >
              {n}
            </Key>
          ))}
        </div>
      </section>

      {/* Hole nav */}
      <div className="mt-[26px] flex gap-[10px] border-t-4 border-[var(--bs-ink)] px-5 pb-5 pt-4">
        <Key
          variant="default"
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="h-[66px] flex-1 text-[17px]"
        >
          ← Hole {current}
        </Key>
        {onLastHole ? (
          <Key variant="on" onClick={finish} className="h-[66px] flex-1 text-[17px]">
            Finish round →
          </Key>
        ) : (
          <Key
            variant="on"
            onClick={() => setCurrent((c) => Math.min(holes - 1, c + 1))}
            className="h-[66px] flex-1 text-[17px]"
          >
            Hole {current + 2} →
          </Key>
        )}
      </div>
    </div>
  );
}

export default function Game() {
  return (
    <Suspense
      fallback={
        <>
          <ScreenHeader label="Round" status="Loading" />
          <p className="bs-note px-5 pt-6">Opening your round…</p>
        </>
      }
    >
      <GameContent />
    </Suspense>
  );
}
