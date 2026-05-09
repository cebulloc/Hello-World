# Database schema

SQLite via `better-sqlite3`. The canonical schema lives in
`server/src/db/schema.sql`; this document explains it.

## Entity relationship

```
users 1---* user_lesson_progress *---1 lessons
  \                                      |
   \---* user_drill_attempts             *
                                         |
                                  lessons.steps (JSON column)
```

Lessons are authored as JSON files and synced into the `lessons` table by
the seed script. Drills are derived from lessons and stored separately so
practice attempts can be tracked without coupling to a lesson row.

## Tables

### `users`

| column      | type        | notes                                  |
| ----------- | ----------- | -------------------------------------- |
| id          | INTEGER PK  | autoincrement                          |
| username    | TEXT UNIQUE | display name                           |
| created_at  | TEXT        | ISO-8601                               |
| xp          | INTEGER     | total experience points (default 0)    |
| level       | INTEGER     | derived from xp at write time          |
| streak_days | INTEGER     | consecutive days with >=1 completion   |
| last_active | TEXT        | ISO date used for streak calc          |
| settings    | TEXT (JSON) | tuning, handedness, label prefs        |

### `lessons`

| column        | type        | notes                                  |
| ------------- | ----------- | -------------------------------------- |
| id            | TEXT PK     | slug, e.g. `first-open-chords`         |
| title         | TEXT        |                                        |
| summary       | TEXT        | one-sentence description               |
| track         | TEXT        | `chords`, `rhythm`, `scales`, etc.     |
| difficulty    | INTEGER     | 1-5                                    |
| order_index   | INTEGER     | within track ordering                  |
| prerequisites | TEXT (JSON) | array of lesson ids                    |
| theory_tags   | TEXT (JSON) | e.g. `["intervals","triads"]`          |
| steps         | TEXT (JSON) | array of step objects (see below)      |
| xp_reward     | INTEGER     | granted on completion                  |

A `step` is a tagged union; the renderer dispatches on `step.kind`.
See [LESSON_FORMAT.md](./LESSON_FORMAT.md) for the full schema.

### `drills`

| column      | type        | notes                                  |
| ----------- | ----------- | -------------------------------------- |
| id          | TEXT PK     | e.g. `chord-switch-G-Cadd9`            |
| kind        | TEXT        | `chord_switch`, `scale_memo`,          |
|             |             | `interval_id`, `ear_interval`          |
| title       | TEXT        |                                        |
| config      | TEXT (JSON) | drill-specific (see service)           |
| theory_tags | TEXT (JSON) |                                        |

### `user_lesson_progress`

| column         | type       | notes                                |
| -------------- | ---------- | ------------------------------------ |
| user_id        | INTEGER FK | -> users.id                          |
| lesson_id      | TEXT FK    | -> lessons.id                        |
| status         | TEXT       | `not_started`, `in_progress`, `done` |
| accuracy       | REAL       | 0..1, last attempt                   |
| best_accuracy  | REAL       | 0..1, lifetime best                  |
| attempts       | INTEGER    | total attempts                       |
| completed_at   | TEXT NULL  | ISO timestamp of first completion    |
| updated_at     | TEXT       | ISO timestamp                        |
| PRIMARY KEY    |            | (user_id, lesson_id)                 |

### `user_drill_attempts`

| column     | type       | notes                                  |
| ---------- | ---------- | -------------------------------------- |
| id         | INTEGER PK | autoincrement                          |
| user_id    | INTEGER FK | -> users.id                            |
| drill_id   | TEXT FK    | -> drills.id                           |
| score      | REAL       | 0..1                                   |
| duration_s | INTEGER    | seconds played                         |
| metadata   | TEXT (JSON)| free-form, e.g. tempo or missed items  |
| created_at | TEXT       | ISO timestamp                          |

## Derivations

- `level = floor(sqrt(xp / 50))` &mdash; computed in `progressService` and
  stored on write.
- `streak_days` &mdash; on each progress write, compare today vs `last_active`:
  same day no-op, +1 day increments, otherwise reset to 1.
- Weak-area = the `theory_tag` whose mean `accuracy` across the user's
  attempts is lowest, requiring at least 2 attempts to qualify.

## Indexes

- `user_lesson_progress(user_id, status)` &mdash; dashboard queries.
- `user_drill_attempts(user_id, created_at DESC)` &mdash; recent activity feed.
- `lessons(track, order_index)` &mdash; track view ordering.
