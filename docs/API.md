# API

Base URL: `http://localhost:4000/api` in development.

All endpoints accept and return JSON. Errors use the shape:

```json
{ "error": { "code": "not_found", "message": "Lesson not found" } }
```

## Auth (MVP)

There is no real auth. The client passes a header:

```
X-User-Id: <int>
```

The server creates a demo user on first contact and returns its id, which
the client persists to localStorage. Real auth lands in v1.

## Endpoints

### Users

#### `POST /api/users/demo`
Create or fetch the demo user. Returns the user row.

```json
{ "id": 1, "username": "demo", "xp": 0, "level": 0, "streakDays": 0 }
```

#### `GET /api/users/:id`
Returns the user row including `settings`.

#### `PATCH /api/users/:id/settings`
Body: partial settings object. Returns the merged settings.

```json
{ "tuning": "drop-d", "leftHanded": false, "showNoteNames": true }
```

### Lessons

#### `GET /api/lessons`
Optional query: `?track=chords`.

Returns an array of lesson summaries (no `steps`):

```json
[
  {
    "id": "first-open-chords",
    "title": "Your first open chords",
    "track": "chords",
    "difficulty": 1,
    "summary": "Em, Am, and D -- the three chords that unlock most songs.",
    "xpReward": 60
  }
]
```

#### `GET /api/lessons/:id`
Full lesson, including `steps` and `theoryTags`.

### Progress

#### `GET /api/users/:id/progress`
Aggregate dashboard payload.

```json
{
  "user": { "id": 1, "xp": 1240, "level": 4, "streakDays": 7 },
  "weakAreas": [ { "tag": "intervals", "accuracy": 0.62 } ],
  "recentLessons": [ { "lessonId": "pentatonic-scale", "status": "in_progress" } ],
  "nextRecommended": { "lessonId": "understanding-intervals", "reason": "weak in intervals" }
}
```

#### `POST /api/users/:id/progress/lesson`
Body:

```json
{ "lessonId": "first-open-chords", "accuracy": 0.91, "completed": true }
```

Returns:

```json
{
  "progress": { "lessonId": "first-open-chords", "status": "done", "accuracy": 0.91 },
  "user":     { "xp": 1300, "level": 4, "streakDays": 8 },
  "leveledUp": false
}
```

#### `POST /api/users/:id/progress/drill`
Body:

```json
{ "drillId": "chord-switch-G-Cadd9", "score": 0.75, "durationSec": 60, "metadata": { "tempo": 80 } }
```

Returns the inserted attempt and the user delta.

### AI assists

All AI endpoints are rule-based by default; pass `?provider=llm` to opt into
the LLM provider once `ANTHROPIC_API_KEY` is configured server-side.

#### `GET /api/ai/recommendation/:userId`
Adaptive next-lesson recommendation.

```json
{ "lessonId": "understanding-intervals", "reason": "Your intervals accuracy is 62 percent." }
```

#### `GET /api/ai/practice-routine/:userId?minutes=15`
A drill stack tailored to weak areas.

```json
{
  "minutes": 15,
  "blocks": [
    { "kind": "ear_interval", "title": "Interval ear ID", "duration": 5 },
    { "kind": "chord_switch", "title": "G <-> Cadd9", "duration": 5, "tempo": 80 },
    { "kind": "scale_memo",   "title": "A minor pentatonic", "duration": 5 }
  ]
}
```

#### `POST /api/ai/jam-coach`
Body:

```json
{ "progression": ["Am","G","F","E"], "feel": "straight" }
```

Returns:

```json
{
  "key": "A minor",
  "scales": [
    { "name": "A natural minor", "fitness": 0.95, "notes": ["A","B","C","D","E","F","G"] },
    { "name": "A minor pentatonic", "fitness": 0.9,  "notes": ["A","C","D","E","G"] }
  ],
  "explanation": "Every chord but E is diatonic to A minor; E is the V, which borrows the leading tone G# from the harmonic minor."
}
```

## Errors

| code           | http | meaning                                |
| -------------- | ---- | -------------------------------------- |
| `bad_request`  | 400  | malformed body or query                |
| `not_found`    | 404  | resource missing                       |
| `conflict`     | 409  | violates a unique constraint           |
| `internal`     | 500  | unhandled exception                    |
