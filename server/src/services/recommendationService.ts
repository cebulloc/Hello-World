import { listLessons } from "./lessonService.js";
import {
  listProgress,
  weakAreas,
  type LessonProgress,
} from "./progressService.js";

export interface Recommendation {
  lessonId: string;
  reason: string;
}

export function recommendNextLesson(userId: number): Recommendation | null {
  const lessons = listLessons();
  if (lessons.length === 0) return null;

  const progress = new Map<string, LessonProgress>(
    listProgress(userId).map((p) => [p.lessonId, p]),
  );
  const isDone = (id: string) => progress.get(id)?.status === "done";

  const weak = weakAreas(userId);
  if (weak.length > 0) {
    const tag = weak[0]!.tag;
    const candidate = lessons.find(
      (l) => l.theoryTags.includes(tag) && !isDone(l.id),
    );
    if (candidate) {
      return {
        lessonId: candidate.id,
        reason: `Your ${tag} accuracy is ${Math.round(weak[0]!.accuracy * 100)}%. This lesson reinforces ${tag}.`,
      };
    }
  }

  const inProgress = lessons.find(
    (l) => progress.get(l.id)?.status === "in_progress",
  );
  if (inProgress) {
    return {
      lessonId: inProgress.id,
      reason: "Pick up where you left off.",
    };
  }

  const next = lessons.find((l) => !isDone(l.id));
  if (next) {
    return {
      lessonId: next.id,
      reason: "Next on your path.",
    };
  }

  return {
    lessonId: lessons[0]!.id,
    reason: "Revisit a fundamental.",
  };
}

export interface PracticeBlock {
  kind: string;
  title: string;
  duration: number;
  tempo?: number;
  drillId?: string;
}

export function practiceRoutine(
  userId: number,
  minutes: number,
): { minutes: number; blocks: PracticeBlock[] } {
  const weak = weakAreas(userId).map((w) => w.tag);
  const blocks: PracticeBlock[] = [];

  const has = (tag: string) => weak.includes(tag);

  blocks.push({
    kind: "warmup",
    title: "Chromatic warmup, 4 frets per string",
    duration: 3,
    tempo: 70,
  });

  if (has("intervals") || has("ear")) {
    blocks.push({
      kind: "ear_interval",
      title: "Interval ear ID",
      duration: 5,
      drillId: "ear-intervals-basic",
    });
  }
  if (has("chords") || weak.length === 0) {
    blocks.push({
      kind: "chord_switch",
      title: "G to Cadd9 chord switch",
      duration: 5,
      tempo: 80,
      drillId: "chord-switch-G-Cadd9",
    });
  }
  if (has("scales") || has("pentatonic")) {
    blocks.push({
      kind: "scale_memo",
      title: "A minor pentatonic, position 1",
      duration: 5,
      tempo: 90,
      drillId: "scale-memo-Am-pent",
    });
  }
  if (blocks.length === 1) {
    blocks.push({
      kind: "scale_memo",
      title: "A minor pentatonic, position 1",
      duration: 5,
      tempo: 90,
      drillId: "scale-memo-Am-pent",
    });
  }

  let total = blocks.reduce((s, b) => s + b.duration, 0);
  while (total < minutes) {
    blocks.push({
      kind: "freeplay",
      title: "Improvise over Am loop",
      duration: Math.min(5, minutes - total),
    });
    total = blocks.reduce((s, b) => s + b.duration, 0);
  }
  while (total > minutes && blocks.length > 1) {
    const last = blocks[blocks.length - 1]!;
    if (last.duration > 1 && total - 1 >= minutes) {
      last.duration -= 1;
    } else {
      blocks.pop();
    }
    total = blocks.reduce((s, b) => s + b.duration, 0);
  }

  return { minutes, blocks };
}
