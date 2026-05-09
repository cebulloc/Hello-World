# Architecture

## Goals

1. **Teach theory through playing.** Every concept renders on a fretboard
   the user can click and hear.
2. **Self-paced and modular.** Lessons are data, not code. New content can be
   shipped by dropping a JSON file into `server/src/data/lessons/`.
3. **Production-oriented but small.** Clean layering, typed boundaries, no
   premature distributed-systems complexity.

## High level

```
+----------------------------+         +-----------------------------+
|         client/            |  HTTP   |          server/            |
|  React + Vite + Tailwind   | <-----> |   Express + better-sqlite3  |
|  Tone.js, SVG fretboard    |  JSON   |   REST API + lesson loader  |
+--------------+-------------+         +--------------+--------------+
               |                                      |
               | localStorage (settings,              | dev.sqlite (file)
               | offline progress cache)              |
```

The client is a SPA; the server is a stateless REST API backed by a single
SQLite file. There is no auth in the MVP; a "demo" user is auto-created and
its id is held in `localStorage`. Auth is a v1 milestone.

## Client layers

```
pages/         route-level screens, compose components, no business logic
components/    presentational + small smart components
  ui/          buttons, cards, dialogs, inputs (design system primitives)
  Fretboard/   the SVG fretboard and overlays (scales, chord shapes)
  lessons/     step renderers (text, fretboard exercise, ear training, etc.)
hooks/         useFretboard, useMetronome, useLesson, useProgress
store/         Zustand stores: settings, user, progress
theory/        pure functions: notes, intervals, scales, chords, tunings,
               fretboard math. Has no DOM/audio dependencies, fully testable.
audio/         Tone.js wrapper, metronome, optional pitch detection
api/           thin fetch wrapper + typed endpoint functions
```

The `theory/` module is the heart of the app. It is pure TypeScript with no
side effects, so unit tests can pin its behavior down completely. Both the
fretboard renderer and the lesson engine consume it.

## Server layers

```
routes/        Express routers, request/response shape only
services/      business logic (progress aggregation, recommendations, AI)
db/            schema.sql, migrate.ts, seed.ts, client.ts (better-sqlite3)
data/lessons/  authored lesson JSON, loaded into the DB by seed
middleware/    error handler, request logger
```

Routes never touch the DB directly &mdash; they call services. Services use a
single `db` client exported from `db/client.ts`. Lessons live as JSON in
`data/lessons/` so authors can edit content without writing code; `db:seed`
syncs them into the `lessons` table.

## State management

- **Settings** (theme, tuning, left-handed, show note names): Zustand,
  persisted to `localStorage`.
- **User + progress**: Zustand, hydrated from the API on app boot, written
  back optimistically on each completion.
- **Server cache**: Zustand handles it; we do not pull in React Query for
  the MVP to keep the bundle lean. Easy to add later.

## Audio

`audio/engine.ts` lazily boots a single `Tone.PolySynth` (and a sampled
acoustic guitar set when available) the first time the user interacts. All
playback APIs are async and return immediately if audio is not yet allowed
by the browser. The metronome runs on `Tone.Transport`.

Pitch detection is optional and gated behind an explicit "enable microphone"
button. We use the YIN algorithm against `MediaStreamAudioSourceNode`.

## AI features

The AI services live entirely server-side in `services/`. The MVP ships
**rule-based** implementations so the app works without external API keys:

- `recommendationService` &mdash; picks the next lesson from weak-area metrics.
- `practiceRoutineService` &mdash; assembles a 15-minute drill stack from the
  user's recent accuracy.
- `jamCoachService` &mdash; given a chord progression, returns compatible scales
  with an explanation built from harmonic-function tables.

The route handlers accept an optional `provider: "llm"` flag; when set and
`ANTHROPIC_API_KEY` is configured, the service can swap in an LLM-backed
implementation. This is wired but disabled by default.

## Testing

- `theory/` &mdash; vitest unit tests cover note math, scale generation,
  interval naming, and chord construction.
- `services/` &mdash; vitest covers progression aggregation and the rule-based
  AI services against fixed fixtures.
- UI is exercised manually in the MVP; component tests are a v1 task.

## Deployment (target)

- Client: any static host (Vercel, Netlify, Cloudflare Pages).
- Server: a single Node process; SQLite file on local disk for the MVP,
  Postgres swap behind the same `db/client.ts` interface for v1.
