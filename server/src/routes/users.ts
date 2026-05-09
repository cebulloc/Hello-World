import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../middleware/error.js";
import {
  getOrCreateDemoUser,
  getUser,
  updateSettings,
} from "../services/userService.js";

const router = Router();

router.post("/demo", (_req, res) => {
  const user = getOrCreateDemoUser();
  res.json(user);
});

router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const user = getUser(id);
  if (!user) throw new HttpError(404, "not_found", "User not found");
  res.json(user);
});

const settingsSchema = z
  .object({
    tuning: z.string().optional(),
    leftHanded: z.boolean().optional(),
    showNoteNames: z.boolean().optional(),
    defaultTempo: z.number().int().positive().optional(),
    theme: z.enum(["dark", "light"]).optional(),
  })
  .strict();

router.patch("/:id/settings", (req, res) => {
  const id = Number(req.params.id);
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "bad_request", parsed.error.message);
  }
  const merged = updateSettings(id, parsed.data);
  if (!merged) throw new HttpError(404, "not_found", "User not found");
  res.json(merged);
});

export default router;
