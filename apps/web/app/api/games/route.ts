import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");

    switch (action) {
      case "count":
        const count = await db?.games.count();
        return NextResponse.json({ count });

      case "all":
        const allGames = await db?.games.toArray();
        return NextResponse.json({ games: allGames });

      case "with-courses":
        const gamesWithCourses = await db?.games.toArray();
        const allCourses = await db?.courses.toArray();

        const enrichedGames = gamesWithCourses?.map((game) => {
          const course = allCourses?.find((c) => c.id === game.courseId);
          return {
            ...game,
            course: course
              ? { id: course.id, name: course.name, rounds: course.rounds }
              : null,
          };
        });

        return NextResponse.json({ games: enrichedGames });

      case "by-id":
        if (!id) {
          return NextResponse.json(
            { error: "ID parameter required" },
            { status: 400 }
          );
        }
        const gameById = await db?.games.get(parseInt(id));
        if (!gameById) {
          return NextResponse.json(
            { error: "Game not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ game: gameById });

      case "by-user":
        if (!userId) {
          return NextResponse.json(
            { error: "userId parameter required" },
            { status: 400 }
          );
        }
        const gamesByUser = await db?.games
          .where("userId")
          .equals(userId)
          .toArray();
        return NextResponse.json({ games: gamesByUser });

      case "recent":
        const limit = parseInt(searchParams.get("limit") || "10");
        const recentGames = await db?.games
          .orderBy("date")
          .reverse()
          .limit(limit)
          .toArray();
        return NextResponse.json({ games: recentGames });

      case "stats":
        const totalGames = await db?.games.count();
        const games = await db?.games.toArray();
        const courses = await db?.courses.toArray();

        // Calculate basic statistics
        const totalScore = games?.reduce(
          (sum, game) => sum + (game?.finalScore || 0),
          0
        );
        const safeTotalGames = typeof totalGames === "number" ? totalGames : 0;
        const safeTotalScore = typeof totalScore === "number" ? totalScore : 0;
        const averageScore =
          safeTotalGames > 0 ? safeTotalScore / safeTotalGames : 0;

        // Group by course
        const safeGames = Array.isArray(games) ? games : [];
        const safeCourses = Array.isArray(courses) ? courses : [];
        const courseStats = safeGames.reduce((acc, game) => {
          const course = safeCourses.find((c) => c.id === game.courseId);
          const courseName = course?.name || "Unknown Course";

          if (!acc[courseName]) {
            acc[courseName] = { count: 0, totalScore: 0, averageScore: 0 };
          }
          acc[courseName].count++;
          acc[courseName].totalScore += game.finalScore || 0;
          acc[courseName].averageScore =
            acc[courseName].totalScore / acc[courseName].count;
          return acc;
        }, {} as Record<string, { count: number; totalScore: number; averageScore: number }>);

        return NextResponse.json({
          totalGames,
          totalScore,
          averageScore: Math.round(averageScore * 100) / 100,
          courseStats,
        });

      default:
        return NextResponse.json(
          {
            error: "Invalid action parameter",
            availableActions: [
              "count",
              "all",
              "by-id",
              "by-user",
              "recent",
              "stats",
            ],
            usage: {
              count: "/api/games?action=count",
              all: "/api/games?action=all",
              byId: "/api/games?action=by-id&id=1",
              byUser: "/api/games?action=by-user&userId=user-id",
              recent: "/api/games?action=recent&limit=5",
              stats: "/api/games?action=stats",
            },
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in games API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case "create":
        const newGame = await db?.games.add(data);
        return NextResponse.json({ id: newGame }, { status: 201 });

      case "update":
        const { id, ...updateData } = data;
        if (!id) {
          return NextResponse.json(
            { error: "Game ID required" },
            { status: 400 }
          );
        }
        await db?.games.update(parseInt(id), updateData);
        return NextResponse.json({ success: true });

      case "delete":
        const { id: deleteId } = data;
        if (!deleteId) {
          return NextResponse.json(
            { error: "Game ID required" },
            { status: 400 }
          );
        }
        await db?.games.delete(parseInt(deleteId));
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json(
          {
            error: "Invalid action parameter",
            availableActions: ["create", "update", "delete"],
            usage: {
              create: { action: "create", ...data },
              update: { action: "update", id: 1, ...updateData },
              delete: { action: "delete", id: 1 },
            },
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in games API POST:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
