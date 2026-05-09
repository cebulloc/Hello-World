import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../middleware/error.js";
import {
  practiceRoutine,
  recommendNextLesson,
} from "../services/recommendationService.js";
import { suggestForProgression } from "../services/jamCoachService.js";

const router = Router();

router.get("/recommendation/:userId", (req, res) => {
  const id = Number(req.params.userId);
  const result = recommendNextLesson(id);
  if (!result) throw new HttpError(404, "not_found", "No lessons available");
  res.json(result);
});

router.get("/practice-routine/:userId", (req, res) => {
  const id = Number(req.params.userId);
  const minutes = Math.max(
    5,
    Math.min(60, Number(req.query.minutes ?? 15) || 15),
  );
  res.json(practiceRoutine(id, minutes));
});

const jamSchema = z.object({
  progression: z.array(z.string()).min(1),
  feel: z.enum(["straight", "shuffle"]).default("straight"),
});

router.post("/jam-coach", (req, res) => {
  const parsed = jamSchema.safeParse(req.body);
  if (!parsed.success)
    throw new HttpError(400, "bad_request", parsed.error.message);
  const result = suggestForProgression(parsed.data.progression);
  if (!result)
    throw new HttpError(400, "bad_request", "Could not parse progression");
  res.json(result);
});

export default router;
