import { z } from "zod";

const proseStep = z.object({
  kind: z.literal("prose"),
  title: z.string(),
  body: z.string(),
});

const fretboardStep = z.object({
  kind: z.literal("fretboard"),
  title: z.string(),
  body: z.string(),
  diagram: z.object({
    kind: z.enum(["chord", "scale", "notes"]),
    name: z.string().optional(),
    frets: z.array(z.number().int()).optional(),
    fingers: z.array(z.number().int()).optional(),
    scale: z
      .object({ root: z.string(), name: z.string() })
      .optional(),
    notes: z.array(z.string()).optional(),
  }),
});

const chordTrainerStep = z.object({
  kind: z.literal("chordTrainer"),
  title: z.string(),
  chords: z.array(z.string()).min(2),
  tempo: z.number().int().positive().default(60),
  bars: z.number().int().positive().default(8),
});

const scaleExerciseStep = z.object({
  kind: z.literal("scaleExercise"),
  title: z.string(),
  scale: z.object({ root: z.string(), name: z.string() }),
  tempo: z.number().int().positive().default(80),
});

const intervalQuizStep = z.object({
  kind: z.literal("intervalQuiz"),
  title: z.string(),
  questions: z.number().int().positive().default(6),
  pool: z.array(z.string()).min(2),
});

const earQuizStep = z.object({
  kind: z.literal("earQuiz"),
  title: z.string(),
  questions: z.number().int().positive().default(6),
  pool: z.array(z.string()).min(2),
});

const rhythmStep = z.object({
  kind: z.literal("rhythm"),
  title: z.string(),
  pattern: z.array(z.enum(["X", "."])).min(1),
  tempo: z.number().int().positive().default(80),
  bars: z.number().int().positive().default(4),
});

export const stepSchema = z.discriminatedUnion("kind", [
  proseStep,
  fretboardStep,
  chordTrainerStep,
  scaleExerciseStep,
  intervalQuizStep,
  earQuizStep,
  rhythmStep,
]);

export const lessonSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  summary: z.string(),
  track: z.enum(["chords", "rhythm", "scales", "theory", "ear", "improv"]),
  difficulty: z.number().int().min(1).max(5),
  orderIndex: z.number().int().nonnegative(),
  prerequisites: z.array(z.string()).default([]),
  theoryTags: z.array(z.string()).default([]),
  xpReward: z.number().int().nonnegative().default(50),
  steps: z.array(stepSchema).min(1),
});

export type Lesson = z.infer<typeof lessonSchema>;
export type LessonStep = z.infer<typeof stepSchema>;
