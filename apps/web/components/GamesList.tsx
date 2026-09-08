"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "../lib/db";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import Link from "next/link";

export default function GamesList() {
  const queryClient = useQueryClient();
  // Simple React Query hook for fetching games
  const {
    data: games = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      if (!db) return [];

      const raw = await db.games.toArray();
      const courses = await db.courses.toArray();
      const courseMap = new Map(courses.map((c) => [c.id, c.name]));

      // Get the most recent game for each course
      const uniqueGames = raw
        .filter((game) => game.courseId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .filter(
          (game, index, self) =>
            index === self.findIndex((g) => g.courseId === game.courseId)
        );

      return uniqueGames.map((g) => ({
        id: g.id!,
        courseId: g.courseId,
        courseName: courseMap.get(g.courseId) ?? "",
        datePlayed: g.date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        finalScore: g.finalScore ?? 0,
      }));
    },
    enabled: !!db,
  });

  // Delete mutation
  const deleteGameMutation = useMutation({
    mutationFn: async (gameId: number) => {
      if (!db) throw new Error("Database not available");

      await db?.transaction("rw", db.games, db.scores, async () => {
        await db?.scores.where("gameId").equals(gameId).delete();
        await db?.games.delete(gameId);
      });
    },
    onSuccess: () => {
      // Invalidate and refetch games
      queryClient.invalidateQueries({ queryKey: ["games"] });
    },
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: games?.length ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading games...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error loading games: {error.message}</p>
        </div>
      </div>
    );
  }

  // if we have games, we'd list them here
  if (games && games.length > 0) {
    return (
      <div
        ref={parentRef}
        className="overflow-y-auto pb-32"
        style={{ height: "calc(100vh - 80px)" }}
      >
        <div
          style={{
            height: rowVirtualizer.getTotalSize(),
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const game = games![virtualRow.index];
            return (
              <div
                key={`game-${game.id}-${virtualRow.index}`}
                style={{
                  position: "absolute",
                  top: virtualRow.start,
                  width: "100%",
                }}
                className="px-6 py-2"
              >
                <div className="bg-white rounded-xl shadow-lg border-2 border-amber-100 flex items-center justify-between p-6 mb-4 hover:shadow-xl transition-shadow duration-200">
                  <Link
                    href={`/game?courseId=${game.courseId}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="space-y-2">
                      <div className="text-xl font-bold text-slate-800 leading-tight">
                        {game.courseName}
                      </div>
                      <div className="text-base text-slate-600 font-medium">
                        Date Played: {game.datePlayed}
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center shadow-md border-2 border-orange-200">
                      <span className="text-white font-bold text-lg">
                        {game.finalScore}
                      </span>
                    </div>
                    <div className="border-l-2 border-slate-200 h-12 mx-2"></div>
                    <button
                      onClick={() => deleteGameMutation.mutate(game.id)}
                      className="w-12 h-12 flex items-center justify-center text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors cursor-pointer border-2 border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      title="Delete game"
                      aria-label={`Delete game at ${game.courseName}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // No games found
  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 mb-4">No games found.</p>
        <p className="text-sm text-gray-500">Create a course to get started!</p>
      </div>
    </div>
  );
}
