// src/services/db.ts
import Dexie, { Table } from "dexie";

export interface Course {
  id?: number;
  name: string;
  rounds: 9 | 18;
  profileId: string; // Link to profile instead of user
}

export interface Game {
  id?: number;
  date: Date;
  courseId: number;
  finalNote: string;
  finalScore: number;
  scores: Score[];
}

export interface Score {
  id?: number;
  gameId: number;
  hole: number;
  par: string;
  score: string;
  putts: number;
}

export class AppDB extends Dexie {
  courses!: Table<Course, number>;
  games!: Table<Game, number>;
  scores!: Table<Score, number>;

  constructor() {
    super("ScoreCardNotes");

    this.version(1).stores({
      courses: "++id, name, rounds",
      games: "++id, date, courseId",
      scores: "++id, gameId, hole, putts",
    });

    this.version(2).stores({
      courses: "++id, name, rounds",
      games: "++id, date, courseId, finalNote, finalScore",
      scores: "++id, gameId, hole, putts",
    });

    this.version(3).stores({
      courses: "++id, name, rounds",
      games: "++id, date, courseId, finalNote, finalScore, scores",
      scores: "++id, gameId, hole, putts",
    });

    // New version removing user/account dependency
    this.version(4).stores({
      courses: "++id, name, rounds",
      games: "++id, date, courseId, finalNote, finalScore",
      scores: "++id, gameId, hole, putts",
    });

    // Version 6: Remove user tracking
    this.version(6).stores({
      courses: "++id, name, rounds, userId",
      games: "++id, date, courseId, finalNote, finalScore",
      scores: "++id, gameId, hole, putts",
    });

    // Version 7: Rename rating to putts for better golf experience
    this.version(7).stores({
      courses: "++id, name, rounds, userId",
      games: "++id, date, courseId, finalNote, finalScore",
      scores: "++id, gameId, hole, putts",
    });

    // Version 8: Switch from user to profile system
    this.version(8).stores({
      courses: "++id, name, rounds, profileId",
      games: "++id, date, courseId, finalNote, finalScore",
      scores: "++id, gameId, hole, putts",
    });
  }
}

// Only create database instance in browser environment
export const db =
  typeof window !== "undefined" ? new AppDB() : (null as AppDB | null);
