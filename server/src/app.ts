import express from "express";
import cors from "cors";
import users from "./routes/users.js";
import lessons from "./routes/lessons.js";
import progress from "./routes/progress.js";
import ai from "./routes/ai.js";
import { errorHandler, notFound } from "./middleware/error.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/users", users);
  app.use("/api/users", progress); // /:id/progress, /:id/progress/lesson
  app.use("/api/lessons", lessons);
  app.use("/api/ai", ai);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
