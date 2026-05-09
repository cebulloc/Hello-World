import { db } from "../db/client.js";
import type { LessonStep } from "./lessonSchema.js";

export interface LessonSummary {
  id: string;
  title: string;
  summary: string;
  track: string;
  difficulty: number;
  orderIndex: number;
  theoryTags: string[];
  xpReward: number;
}

export interface Lesson extends LessonSummary {
  prerequisites: string[];
  steps: LessonStep[];
}

interface LessonRow {
  id: string;
  title: string;
  summary: string;
  track: string;
  difficulty: number;
  order_index: number;
  prerequisites: string;
  theory_tags: string;
  steps: string;
  xp_reward: number;
}

function toSummary(row: LessonRow): LessonSummary {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    track: row.track,
    difficulty: row.difficulty,
    orderIndex: row.order_index,
    theoryTags: JSON.parse(row.theory_tags),
    xpReward: row.xp_reward,
  };
}

function toFull(row: LessonRow): Lesson {
  return {
    ...toSummary(row),
    prerequisites: JSON.parse(row.prerequisites),
    steps: JSON.parse(row.steps),
  };
}

export function listLessons(track?: string): LessonSummary[] {
  const rows = track
    ? (db
        .prepare(
          `SELECT * FROM lessons WHERE track = ? ORDER BY order_index ASC`,
        )
        .all(track) as LessonRow[])
    : (db
        .prepare(`SELECT * FROM lessons ORDER BY track, order_index ASC`)
        .all() as LessonRow[]);
  return rows.map(toSummary);
}

export function getLesson(id: string): Lesson | null {
  const row = db.prepare(`SELECT * FROM lessons WHERE id = ?`).get(id) as
    | LessonRow
    | undefined;
  return row ? toFull(row) : null;
}
