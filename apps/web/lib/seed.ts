import { db } from "./db";

export async function seedDatabase() {
  if (!db) {
    throw new Error("Database not available");
  }

  // Clear existing data
  await db.delete();
  await db.open();

  // Create two courses
  const course1Id = await db.courses.add({
    name: "Pine Valley Golf Club",
    rounds: 9,
    profileId: "1",
  });

  const course2Id = await db.courses.add({
    name: "Augusta National Golf Club",
    rounds: 9,
    profileId: "1",
  });

  // Create a game for course 1
  const game1Id = await db.games.add({
    courseId: course1Id,
    date: new Date("2024-03-15"),
    finalScore: 45,
    finalNote: "Great day for golf!",
    scores: [],
  });

  // Create a game for course 2
  const game2Id = await db.games.add({
    courseId: course2Id,
    date: new Date("2024-03-16"),
    finalScore: 42,
    finalNote: "Beautiful course, challenging holes",
    scores: [],
  });

  // Create scores for game 1
  for (let hole = 0; hole < 9; hole++) {
    await db.scores.add({
      gameId: game1Id,
      hole: hole,
      par: String(Math.floor(Math.random() * 2) + 3), // Random par 3 or 4
      score: String(Math.floor(Math.random() * 3) + 4), // Random score 4-6
      putts: Math.floor(Math.random() * 4) + 1, // Random putts 1-4
    });
  }

  // Create scores for game 2
  for (let hole = 0; hole < 9; hole++) {
    await db.scores.add({
      gameId: game2Id,
      hole: hole,
      par: String(Math.floor(Math.random() * 2) + 3), // Random par 3 or 4
      score: String(Math.floor(Math.random() * 3) + 3), // Random score 3-5
      putts: Math.floor(Math.random() * 4) + 1, // Random putts 1-3
    });
  }

  console.log("Database seeded successfully!");
}

// Only run seed function in browser environment
if (typeof window !== "undefined") {
  seedDatabase().catch(console.error);
}
