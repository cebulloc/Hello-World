# Lesson JSON format

Lessons are authored as JSON files in `server/src/data/lessons/` and synced
into the database by `npm run db:seed`. The schema is intentionally small:
prose, exercise, and quiz steps cover most of what we need today, and new
step kinds are easy to add.

## Top-level

```jsonc
{
  "id": "first-open-chords",                  // slug, unique
  "title": "Your first open chords",
  "summary": "Em, Am, D -- the three chords that unlock most songs.",
  "track": "chords",                            // chords|rhythm|scales|theory|ear|improv
  "difficulty": 1,                              // 1-5
  "orderIndex": 1,                              // within track
  "prerequisites": [],                          // array of lesson ids
  "theoryTags": ["chords", "open-position"],
  "xpReward": 60,
  "steps": [ /* see below */ ]
}
```

## Step kinds

A `step` is a tagged union; `kind` selects the renderer.

### `prose`
Plain markdown-ish text. Headings and emphasis only, no scripts.

```json
{
  "kind": "prose",
  "title": "What is a chord?",
  "body": "A chord is three or more notes played together. Today we'll learn three of the most-used **open** chords."
}
```

### `fretboard`
Read-only fretboard graphic with notes/intervals/chord shapes drawn on top.
Used for "look at this" steps.

```json
{
  "kind": "fretboard",
  "title": "E minor",
  "body": "Hold strings 5 and 4 at fret 2 with fingers 2 and 3. Strum all six strings.",
  "diagram": {
    "kind": "chord",
    "name": "Em",
    "frets": [0, 2, 2, 0, 0, 0],   // string 6..1
    "fingers": [0, 2, 3, 0, 0, 0]
  }
}
```

### `chordTrainer`
Interactive: user is told to play a chord; the app shows the diagram and
optional metronome clicks; user taps "got it" to advance.

```json
{
  "kind": "chordTrainer",
  "title": "Switch between Em and Am",
  "chords": ["Em", "Am"],
  "tempo": 60,
  "bars": 8
}
```

### `scaleExercise`
Plays/animates a scale and asks the user to play along; on "done" the user
self-reports accuracy 0..1.

```json
{
  "kind": "scaleExercise",
  "title": "A minor pentatonic, position 1",
  "scale": { "root": "A", "name": "minor_pentatonic" },
  "tempo": 80
}
```

### `intervalQuiz`
Visual interval recognition. The fretboard shows two notes; the user picks
the interval name from a multiple-choice list.

```json
{
  "kind": "intervalQuiz",
  "title": "Name that interval",
  "questions": 6,
  "pool": ["m3", "M3", "P4", "P5", "m7"]
}
```

### `earQuiz`
Plays an interval; the user picks the name. Same `pool` semantics.

```json
{
  "kind": "earQuiz",
  "title": "Hear the interval",
  "questions": 6,
  "pool": ["m3", "M3", "P4", "P5"]
}
```

### `rhythm`
Simple rhythm pattern with optional metronome. The pattern is an array of
"X" (strum) and "." (rest), one entry per eighth note.

```json
{
  "kind": "rhythm",
  "title": "Down, down-up, up, down-up",
  "pattern": ["X", ".", "X", "X", ".", "X", "X", "."],
  "tempo": 80,
  "bars": 4
}
```

## Validation

The server validates each lesson on load with a small Zod schema in
`server/src/services/lessonSchema.ts`. Invalid lessons are skipped and the
server logs a warning rather than crashing.
