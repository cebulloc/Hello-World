import { db } from "../db/client.js";
import { getLesson } from "./lessonService.js";
import { getUser } from "./userService.js";

export interface LessonProgress {
  lessonId: string;
  status: "not_started" | "in_progress" | "done";
  accuracy: number;
  bestAccuracy: number;
  attempts: number;
  completedAt: string | null;
  updatedAt: string;
}

interface ProgressRow {
  user_id: number;
  lesson_id: string;
  status: LessonProgress["status"];
  accuracy: number;
  best_accuracy: number;
  attempts: number;
  completed_at: string | null;
  updated_at: string;
}

export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50));
}

export function listProgress(userId: number): LessonProgress[] {
  const rows = db
    .prepare(`SELECT * FROM user_lesson_progress WHERE user_id = ?`)
    .all(userId) as ProgressRow[];
  return rows.map((r) => ({
    lessonId: r.lesson_id,
    status: r.status,
    accuracy: r.accuracy,
    bestAccuracy: r.best_accuracy,
    attempts: r.attempts,
    completedAt: r.completed_at,
    updatedAt: r.updated_at,
  }));
}

function bumpStreak(
  userId: number,
  today: string,
): { streakDays: number } {
  const user = getUser(userId);
  if (!user) return { streakDays: 0 };
  const last = user.lastActive ? user.lastActive.slice(0, 10) : null;
  let streak = user.streakDays;
  if (!last) streak = 1;
  else if (last === today) streak = Math.max(streak, 1);
  else {
    const lastDate = new Date(last + "T00:00:00Z").getTime();
    const todayDate = new Date(today + "T00:00:00Z").getTime();
    const diffDays = Math.round((todayDate - lastDate) / 86400000);
    streak = diffDays === 1 ? streak + 1 : 1;
  }
  db.prepare(`UPDATE users SET streak_days = ?, last_active = ? WHERE id = ?`)
    .run(streak, new Date().toISOString(), userId);
  return { streakDays: streak };
}

export function recordLessonAttempt(
  userId: number,
  lessonId: string,
  accuracy: number,
  completed: boolean,
): {
  progress: LessonProgress;
  user: { xp: number; level: number; streakDays: number };
  leveledUp: boolean;
} | null {
  const lesson = getLesson(lessonId);
  const user = getUser(userId);
  if (!lesson || !user) return null;

  const today = new Date().toISOString().slice(0, 10);
  const prior = db
    .prepare(
      `SELECT * FROM user_lesson_progress WHERE user_id = ? AND lesson_id = ?`,
    )
    .get(userId, lessonId) as ProgressRow | undefined;

  const wasDone = prior?.status === "done";
  const status: LessonProgress["status"] = completed
    ? "done"
    : prior?.status === "done"
      ? "done"
      : "in_progress";
  const best = Math.max(prior?.best_accuracy ?? 0, accuracy);
  const attempts = (prior?.attempts ?? 0) + 1;
  const completedAt =
    prior?.completed_at ?? (completed ? new Date().toISOString() : null);

  db.prepare(
    `
    INSERT INTO user_lesson_progress
      (user_id, lesson_id, status, accuracy, best_accuracy, attempts, completed_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, lesson_id) DO UPDATE SET
      status=excluded.status,
      accuracy=excluded.accuracy,
      best_accuracy=excluded.best_accuracy,
      attempts=excluded.attempts,
      completed_at=COALESCE(user_lesson_progress.completed_at, excluded.completed_at),
      updated_at=excluded.updated_at
  `,
  ).run(
    userId,
    lessonId,
    status,
    accuracy,
    best,
    attempts,
    completedAt,
    new Date().toISOString(),
  );

  let leveledUp = false;
  let newXp = user.xp;
  let newLevel = user.level;
  if (completed && !wasDone) {
    newXp = user.xp + lesson.xpReward;
    newLevel = levelForXp(newXp);
    leveledUp = newLevel > user.level;
    db.prepare(`UPDATE users SET xp = ?, level = ? WHERE id = ?`).run(
      newXp,
      newLevel,
      userId,
    );
  }

  const { streakDays } = bumpStreak(userId, today);
  const progress = (db
    .prepare(
      `SELECT * FROM user_lesson_progress WHERE user_id = ? AND lesson_id = ?`,
    )
    .get(userId, lessonId)) as ProgressRow;

  return {
    progress: {
      lessonId,
      status: progress.status,
      accuracy: progress.accuracy,
      bestAccuracy: progress.best_accuracy,
      attempts: progress.attempts,
      completedAt: progress.completed_at,
      updatedAt: progress.updated_at,
    },
    user: { xp: newXp, level: newLevel, streakDays },
    leveledUp,
  };
}

export function recordDrillAttempt(
  userId: number,
  drillId: string,
  score: number,
  durationSec: number,
  metadata: Record<string, unknown>,
) {
  const info = db
    .prepare(
      `INSERT INTO user_drill_attempts (user_id, drill_id, score, duration_s, metadata) VALUES (?,?,?,?,?)`,
    )
    .run(userId, drillId, score, durationSec, JSON.stringify(metadata));

  const today = new Date().toISOString().slice(0, 10);
  const { streakDays } = bumpStreak(userId, today);
  return { id: info.lastInsertRowid, streakDays };
}

export interface WeakArea {
  tag: string;
  accuracy: number;
  samples: number;
}

interface AccuracyTagRow {
  theory_tags: string;
  best_accuracy: number;
}

interface DrillTagRow {
  theory_tags: string;
  score: number;
}

export function weakAreas(userId: number): WeakArea[] {
  const lessonRows = db
    .prepare(
      `
      SELECT l.theory_tags as theory_tags, p.best_accuracy as best_accuracy
      FROM user_lesson_progress p
      JOIN lessons l ON l.id = p.lesson_id
      WHERE p.user_id = ? AND p.attempts > 0
    `,
    )
    .all(userId) as AccuracyTagRow[];

  const drillRows = db
    .prepare(
      `
      SELECT d.theory_tags as theory_tags, a.score as score
      FROM user_drill_attempts a
      JOIN drills d ON d.id = a.drill_id
      WHERE a.user_id = ?
    `,
    )
    .all(userId) as DrillTagRow[];

  const buckets = new Map<string, { sum: number; n: number }>();
  const add = (tagsJson: string, value: number) => {
    const tags = JSON.parse(tagsJson) as string[];
    for (const tag of tags) {
      const b = buckets.get(tag) ?? { sum: 0, n: 0 };
      b.sum += value;
      b.n += 1;
      buckets.set(tag, b);
    }
  };
  for (const r of lessonRows) add(r.theory_tags, r.best_accuracy);
  for (const r of drillRows) add(r.theory_tags, r.score);

  return Array.from(buckets.entries())
    .filter(([, b]) => b.n >= 2)
    .map(([tag, b]) => ({
      tag,
      accuracy: b.sum / b.n,
      samples: b.n,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

export function dashboard(userId: number) {
  const user = getUser(userId);
  if (!user) return null;
  const all = listProgress(userId);
  const recent = all
    .filter((p) => p.status !== "not_started")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);
  return {
    user: {
      id: user.id,
      xp: user.xp,
      level: user.level,
      streakDays: user.streakDays,
    },
    weakAreas: weakAreas(userId).slice(0, 3),
    recentLessons: recent,
  };
}
