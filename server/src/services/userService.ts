import { db } from "../db/client.js";

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

interface UserRow {
  id: number;
  username: string;
  xp: number;
  level: number;
  streak_days: number;
  last_active: string | null;
  settings: string;
}

const defaults: UserSettings = {
  tuning: "standard",
  leftHanded: false,
  showNoteNames: true,
  defaultTempo: 90,
  theme: "dark",
};

function toUser(row: UserRow): User {
  let parsed: Partial<UserSettings> = {};
  try {
    parsed = JSON.parse(row.settings);
  } catch {
    parsed = {};
  }
  return {
    id: row.id,
    username: row.username,
    xp: row.xp,
    level: row.level,
    streakDays: row.streak_days,
    lastActive: row.last_active,
    settings: { ...defaults, ...parsed },
  };
}

export function getOrCreateDemoUser(): User {
  const existing = db
    .prepare(`SELECT * FROM users WHERE username = 'demo'`)
    .get() as UserRow | undefined;
  if (existing) return toUser(existing);

  const info = db
    .prepare(
      `INSERT INTO users (username, settings) VALUES ('demo', ?)`,
    )
    .run(JSON.stringify(defaults));

  const row = db
    .prepare(`SELECT * FROM users WHERE id = ?`)
    .get(info.lastInsertRowid) as UserRow;
  return toUser(row);
}

export function getUser(id: number): User | null {
  const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as
    | UserRow
    | undefined;
  return row ? toUser(row) : null;
}

export function updateSettings(
  id: number,
  patch: Partial<UserSettings>,
): UserSettings | null {
  const user = getUser(id);
  if (!user) return null;
  const merged = { ...user.settings, ...patch };
  db.prepare(`UPDATE users SET settings = ? WHERE id = ?`).run(
    JSON.stringify(merged),
    id,
  );
  return merged;
}
