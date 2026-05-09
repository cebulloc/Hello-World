import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./client.js";
import { lessonSchema } from "../services/lessonSchema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const lessonsDir = path.resolve(__dirname, "../data/lessons");

function loadLessons() {
  if (!fs.existsSync(lessonsDir)) return [];
  return fs
    .readdirSync(lessonsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const raw = JSON.parse(
        fs.readFileSync(path.join(lessonsDir, f), "utf8"),
      );
      const parsed = lessonSchema.safeParse(raw);
      if (!parsed.success) {
        console.warn(`[seed] skipping ${f}: ${parsed.error.message}`);
        return null;
      }
      return parsed.data;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

function seedLessons() {
  const lessons = loadLessons();
  const insert = db.prepare(`
    INSERT INTO lessons
      (id, title, summary, track, difficulty, order_index,
       prerequisites, theory_tags, steps, xp_reward)
    VALUES
      (@id, @title, @summary, @track, @difficulty, @orderIndex,
       @prerequisites, @theoryTags, @steps, @xpReward)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      summary=excluded.summary,
      track=excluded.track,
      difficulty=excluded.difficulty,
      order_index=excluded.order_index,
      prerequisites=excluded.prerequisites,
      theory_tags=excluded.theory_tags,
      steps=excluded.steps,
      xp_reward=excluded.xp_reward
  `);

  const tx = db.transaction((rows: typeof lessons) => {
    for (const l of rows) {
      insert.run({
        id: l.id,
        title: l.title,
        summary: l.summary,
        track: l.track,
        difficulty: l.difficulty,
        orderIndex: l.orderIndex,
        prerequisites: JSON.stringify(l.prerequisites),
        theoryTags: JSON.stringify(l.theoryTags),
        steps: JSON.stringify(l.steps),
        xpReward: l.xpReward,
      });
    }
  });

  tx(lessons);
  console.log(`Seeded ${lessons.length} lessons.`);
}

function seedDrills() {
  const drills = [
    {
      id: "chord-switch-G-Cadd9",
      kind: "chord_switch",
      title: "G to Cadd9 chord switch",
      config: { chords: ["G", "Cadd9"], tempo: 80, bars: 8 },
      theory_tags: ["chords", "open-position"],
    },
    {
      id: "chord-switch-Em-Am-D",
      kind: "chord_switch",
      title: "Em / Am / D rotation",
      config: { chords: ["Em", "Am", "D"], tempo: 70, bars: 12 },
      theory_tags: ["chords"],
    },
    {
      id: "scale-memo-Am-pent",
      kind: "scale_memo",
      title: "A minor pentatonic, position 1",
      config: { root: "A", scale: "minor_pentatonic", position: 1, tempo: 90 },
      theory_tags: ["scales", "pentatonic"],
    },
    {
      id: "ear-intervals-basic",
      kind: "ear_interval",
      title: "Ear training: basic intervals",
      config: { pool: ["P4", "P5", "M3", "m3", "M6"], questions: 8 },
      theory_tags: ["intervals", "ear"],
    },
    {
      id: "interval-id-basic",
      kind: "interval_id",
      title: "Visual interval ID",
      config: { pool: ["P4", "P5", "M3", "m3", "M6", "m7"], questions: 8 },
      theory_tags: ["intervals"],
    },
  ];

  const insert = db.prepare(`
    INSERT INTO drills (id, kind, title, config, theory_tags)
    VALUES (@id, @kind, @title, @config, @theory_tags)
    ON CONFLICT(id) DO UPDATE SET
      kind=excluded.kind,
      title=excluded.title,
      config=excluded.config,
      theory_tags=excluded.theory_tags
  `);

  const tx = db.transaction(() => {
    for (const d of drills) {
      insert.run({
        id: d.id,
        kind: d.kind,
        title: d.title,
        config: JSON.stringify(d.config),
        theory_tags: JSON.stringify(d.theory_tags),
      });
    }
  });

  tx();
  console.log(`Seeded ${drills.length} drills.`);
}

function seedDemoUser() {
  const exists = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get("demo");
  if (exists) return;
  db.prepare(
    `INSERT INTO users (username, settings) VALUES (?, ?)`,
  ).run(
    "demo",
    JSON.stringify({
      tuning: "standard",
      leftHanded: false,
      showNoteNames: true,
      defaultTempo: 90,
      theme: "dark",
    }),
  );
  console.log("Seeded demo user.");
}

seedLessons();
seedDrills();
seedDemoUser();
