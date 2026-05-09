import { Router } from "express";
import { HttpError } from "../middleware/error.js";
import { getLesson, listLessons } from "../services/lessonService.js";

const router = Router();

router.get("/", (req, res) => {
  const track =
    typeof req.query.track === "string" ? req.query.track : undefined;
  res.json(listLessons(track));
});

router.get("/:id", (req, res) => {
  const lesson = getLesson(req.params.id);
  if (!lesson) throw new HttpError(404, "not_found", "Lesson not found");
  res.json(lesson);
});

export default router;
