import { request } from "./client";

export interface UserSettings {
  tuning: string;
  leftHanded: boolean;
  showNoteNames: boolean;
  defaultTempo: number;
  theme: "dark" | "light";
}

export interface User {
  id: number;
  username: string;
  xp: number;
  level: number;
  streakDays: number;
  lastActive: string | null;
  settings: UserSettings;
}

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

export type LessonStep =
  | { kind: "prose"; title: string; body: string }
  | {
      kind: "fretboard";
      title: string;
      body: string;
      diagram: {
        kind: "chord" | "scale" | "notes";
        name?: string;
        frets?: number[];
        fingers?: number[];
        scale?: { root: string; name: string };
        notes?: string[];
      };
    }
  | {
      kind: "chordTrainer";
      title: string;
      chords: string[];
      tempo: number;
      bars: number;
    }
  | {
      kind: "scaleExercise";
      title: string;
      scale: { root: string; name: string };
      tempo: number;
    }
  | {
      kind: "intervalQuiz";
      title: string;
      questions: number;
      pool: string[];
    }
  | { kind: "earQuiz"; title: string; questions: number; pool: string[] }
  | {
      kind: "rhythm";
      title: string;
      pattern: ("X" | ".")[];
      tempo: number;
      bars: number;
    };

export interface Lesson extends LessonSummary {
  prerequisites: string[];
  steps: LessonStep[];
}

export interface LessonProgress {
  lessonId: string;
  status: "not_started" | "in_progress" | "done";
  accuracy: number;
  bestAccuracy: number;
  attempts: number;
  completedAt: string | null;
  updatedAt: string;
}

export interface DashboardData {
  user: { id: number; xp: number; level: number; streakDays: number };
  weakAreas: { tag: string; accuracy: number; samples: number }[];
  recentLessons: LessonProgress[];
  nextRecommended: { lessonId: string; reason: string } | null;
}

export const api = {
  demoUser: () => request<User>("/users/demo", { method: "POST" }),
  getUser: (id: number) => request<User>(`/users/${id}`),
  updateSettings: (id: number, settings: Partial<UserSettings>) =>
    request<UserSettings>(`/users/${id}/settings`, {
      method: "PATCH",
      body: settings,
    }),

  listLessons: (track?: string) =>
    request<LessonSummary[]>(
      track ? `/lessons?track=${encodeURIComponent(track)}` : "/lessons",
    ),
  getLesson: (id: string) => request<Lesson>(`/lessons/${id}`),

  getDashboard: (userId: number) =>
    request<DashboardData>(`/users/${userId}/progress`),

  postLessonProgress: (
    userId: number,
    body: { lessonId: string; accuracy: number; completed: boolean },
  ) =>
    request<{
      progress: LessonProgress;
      user: { xp: number; level: number; streakDays: number };
      leveledUp: boolean;
    }>(`/users/${userId}/progress/lesson`, { method: "POST", body }),

  postDrillProgress: (
    userId: number,
    body: {
      drillId: string;
      score: number;
      durationSec: number;
      metadata?: Record<string, unknown>;
    },
  ) =>
    request<{ id: number; streakDays: number }>(
      `/users/${userId}/progress/drill`,
      { method: "POST", body },
    ),

  recommendation: (userId: number) =>
    request<{ lessonId: string; reason: string }>(
      `/ai/recommendation/${userId}`,
    ),

  practiceRoutine: (userId: number, minutes = 15) =>
    request<{
      minutes: number;
      blocks: {
        kind: string;
        title: string;
        duration: number;
        tempo?: number;
        drillId?: string;
      }[];
    }>(`/ai/practice-routine/${userId}?minutes=${minutes}`),

  jamCoach: (progression: string[], feel: "straight" | "shuffle" = "straight") =>
    request<{
      key: string;
      scales: { name: string; fitness: number; notes: string[] }[];
      explanation: string;
    }>("/ai/jam-coach", { method: "POST", body: { progression, feel } }),
};
