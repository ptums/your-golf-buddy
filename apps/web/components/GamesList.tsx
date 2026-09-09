"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "../lib/db";
import RoundRow, { type Round } from "./RoundRow";
import { formatDelta, runningTotal, scoreToPar, thruCount } from "../lib/score";

interface CourseGroup {
  courseId: number;
  courseName: string;
  latest: number; // ms — for ordering groups
  rounds: Round[];
}

const dateLabel = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });

async function loadGroups(): Promise<CourseGroup[]> {
  if (!db) return [];
  const [games, courses, scores] = await Promise.all([
    db.games.toArray(),
    db.courses.toArray(),
    db.scores.toArray(),
  ]);
  const courseName = new Map(courses.map((c) => [c.id, c.name]));
  const holeCount = new Map(courses.map((c) => [c.id, c.rounds]));

  const scoresByGame = new Map<number, typeof scores>();
  for (const s of scores) {
    const arr = scoresByGame.get(s.gameId) ?? [];
    arr.push(s);
    scoresByGame.set(s.gameId, arr);
  }

  const groups = new Map<number, CourseGroup>();
  for (const g of games) {
    if (!g.courseId || !courseName.has(g.courseId)) continue;
    const rows = (scoresByGame.get(g.id!) ?? []).map((r) => ({
      par: r.par ?? "",
      score: r.score ?? "",
      putts: r.putts ?? null,
    }));
    const thru = thruCount(rows);
    const holes = holeCount.get(g.courseId) ?? 18;
    const inProgress = !g.completedAt && thru < holes;

    const grp =
      groups.get(g.courseId) ??
      ({
        courseId: g.courseId,
        courseName: courseName.get(g.courseId) ?? "",
        latest: 0,
        rounds: [],
      } as CourseGroup);

    grp.rounds.push({
      id: g.id!,
      courseId: g.courseId,
      dateLabel: dateLabel(new Date(g.date)),
      scoreLine: inProgress
        ? `In progress · thru ${thru}`
        : `${holes} holes`,
      score: g.finalScore ?? runningTotal(rows),
      inProgress,
      delta: inProgress ? formatDelta(scoreToPar(rows)) : null,
    });
    grp.latest = Math.max(grp.latest, new Date(g.date).getTime());
    groups.set(g.courseId, grp);
  }

  const list = [...groups.values()];
  // Order rounds within each group newest-first, and tag the best completed one.
  const gameDate = new Map(games.map((g) => [g.id!, new Date(g.date).getTime()]));
  for (const grp of list) {
    grp.rounds.sort((a, b) => (gameDate.get(b.id) ?? 0) - (gameDate.get(a.id) ?? 0));
    const completed = grp.rounds.filter((r) => !r.inProgress);
    if (completed.length > 1) {
      const best = completed.reduce((lo, r) => (r.score < lo.score ? r : lo));
      best.scoreLine = `${best.scoreLine} · best here`;
    }
  }
  list.sort((a, b) => b.latest - a.latest);
  return list;
}

export default function GamesList() {
  const queryClient = useQueryClient();
  const { data: groups = [], isLoading, error } = useQuery({
    queryKey: ["round-groups"],
    queryFn: loadGroups,
    enabled: !!db,
  });

  const del = useMutation({
    mutationFn: async (gameId: number) => {
      if (!db) throw new Error("Database not available");
      await db.transaction("rw", db.games, db.scores, async () => {
        await db!.scores.where("gameId").equals(gameId).delete();
        await db!.games.delete(gameId);
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["round-groups"] }),
  });

  if (isLoading) {
    return <p className="bs-note px-5 pt-6">Loading your rounds…</p>;
  }
  if (error) {
    return (
      <p className="bs-note px-5 pt-6" style={{ color: "var(--bs-state)" }}>
        Couldn&apos;t load your rounds: {(error as Error).message}
      </p>
    );
  }
  if (groups.length === 0) {
    return (
      <p className="bs-note px-5 pt-6">
        No rounds yet. Tap <strong>New round</strong> to start one.
      </p>
    );
  }

  return (
    <div>
      {groups.map((grp) => (
        <div key={grp.courseId} className="px-5 pt-[22px]">
          <span className="bs-sect">
            {grp.courseName} · {grp.rounds.length}{" "}
            {grp.rounds.length === 1 ? "round" : "rounds"}
          </span>
          <div className="flex flex-col gap-[10px]">
            {grp.rounds.map((r) => (
              <RoundRow key={r.id} round={r} onDelete={(id) => del.mutate(id)} />
            ))}
          </div>
        </div>
      ))}
      <p className="bs-note px-5 pb-2 pt-3 text-[13px]">
        Swipe a round left to reveal Delete.
      </p>
    </div>
  );
}
