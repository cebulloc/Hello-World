import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../middleware/error.js";
import {
  dashboard,
  recordDrillAttempt,
  recordLessonAttempt,
} from "../services/progressService.js";
import { recommendNextLesson } from "../services/recommendationService.js";

const router = Router();

router.get("/:id/progress", (req, res) => {
  const id = Number(req.params.id);
  const data = dashboard(id);
  if (!data) throw new HttpError(404, "not_found", "User not found");
  const next = recommendNextLesson(id);
  res.json({ ...data, nextRecommended: next });
});

const lessonAttemptSchema = z.object({
  lessonId: z.string(),
  accuracy: z.number().min(0).max(1),
  completed: z.boolean(),
});

router.post("/:id/progress/lesson", (req, res) => {
  const id = Number(req.params.id);
  const parsed = lessonAttemptSchema.safeParse(req.body);
  if (!parsed.success)
    throw new HttpError(400, "bad_request", parsed.error.message);
  const result = recordLessonAttempt(
    id,
    parsed.data.lessonId,
    parsed.data.accuracy,
    parsed.data.completed,
  );
  if (!result)
    throw new HttpError(404, "not_found", "User or lesson not found");
  res.json(result);
});

const drillAttemptSchema = z.object({
  drillId: z.string(),
  score: z.number().min(0).max(1),
  durationSec: z.number().int().nonnegative(),
  metadata: z.record(z.unknown()).default({}),
});

router.post("/:id/progress/drill", (req, res) => {
  const id = Number(req.params.id);
  const parsed = drillAttemptSchema.safeParse(req.body);
  if (!parsed.success)
    throw new HttpError(400, "bad_request", parsed.error.message);
  const result = recordDrillAttempt(
    id,
    parsed.data.drillId,
    parsed.data.score,
    parsed.data.durationSec,
    parsed.data.metadata,
  );
  res.json(result);
});

export default router;
