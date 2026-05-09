-- FretForge schema. Idempotent; safe to run repeatedly.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT NOT NULL UNIQUE,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  xp           INTEGER NOT NULL DEFAULT 0,
  level        INTEGER NOT NULL DEFAULT 0,
  streak_days  INTEGER NOT NULL DEFAULT 0,
  last_active  TEXT,
  settings     TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS lessons (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  summary       TEXT NOT NULL,
  track         TEXT NOT NULL,
  difficulty    INTEGER NOT NULL,
  order_index   INTEGER NOT NULL,
  prerequisites TEXT NOT NULL DEFAULT '[]',
  theory_tags   TEXT NOT NULL DEFAULT '[]',
  steps         TEXT NOT NULL,
  xp_reward     INTEGER NOT NULL DEFAULT 50
);

CREATE INDEX IF NOT EXISTS idx_lessons_track_order
  ON lessons(track, order_index);

CREATE TABLE IF NOT EXISTS drills (
  id           TEXT PRIMARY KEY,
  kind         TEXT NOT NULL,
  title        TEXT NOT NULL,
  config       TEXT NOT NULL DEFAULT '{}',
  theory_tags  TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS user_lesson_progress (
  user_id        INTEGER NOT NULL,
  lesson_id      TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'not_started',
  accuracy       REAL NOT NULL DEFAULT 0,
  best_accuracy  REAL NOT NULL DEFAULT 0,
  attempts       INTEGER NOT NULL DEFAULT 0,
  completed_at   TEXT,
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, lesson_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_progress_user_status
  ON user_lesson_progress(user_id, status);

CREATE TABLE IF NOT EXISTS user_drill_attempts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  drill_id    TEXT NOT NULL,
  score       REAL NOT NULL,
  duration_s  INTEGER NOT NULL DEFAULT 0,
  metadata    TEXT NOT NULL DEFAULT '{}',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (drill_id) REFERENCES drills(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_drill_attempts_user_recent
  ON user_drill_attempts(user_id, created_at DESC);
