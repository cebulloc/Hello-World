# FretForge

> Learn guitar by playing it. Theory taught through the fretboard, not flashcards.

FretForge is a cross-platform web app that teaches beginner-to-intermediate
guitarists through interactive lessons, an explorable fretboard, drills, and
ear training. Music theory is woven into every lesson so concepts always
connect back to something you can actually play.

This repository is a TypeScript monorepo with two workspaces:

- `server/` &mdash; Node.js + Express + SQLite (better-sqlite3) REST API.
- `client/` &mdash; React + Vite + Tailwind single-page app.

## Quick start

```bash
# from repo root
npm install                 # installs both workspaces
npm run db:reset            # creates dev.sqlite and seeds lessons
npm run dev                 # runs server (4000) and client (5173) together
```

Open http://localhost:5173.

The client expects the API at `http://localhost:4000`. Override with
`VITE_API_URL` in `client/.env.local`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Run server + client together with hot reload. |
| `npm run dev:server` | Run only the API server. |
| `npm run dev:client` | Run only the React app. |
| `npm run build` | Type-check and build both workspaces. |
| `npm run db:migrate` | Apply schema to the SQLite database. |
| `npm run db:seed` | Insert lessons, drills, and a demo user. |
| `npm run db:reset` | Drop, migrate, and seed in one shot. |
| `npm run lint` | ESLint over both workspaces. |
| `npm run test` | Vitest unit tests (theory engine + services). |

## Documentation

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) &mdash; high level system design.
- [docs/ROADMAP.md](./docs/ROADMAP.md) &mdash; MVP &rarr; v1 &rarr; stretch goals.
- [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) &mdash; tables, columns, relationships.
- [docs/WIREFRAMES.md](./docs/WIREFRAMES.md) &mdash; ASCII wireframes for each major screen.
- [docs/API.md](./docs/API.md) &mdash; REST endpoints and payloads.
- [docs/LESSON_FORMAT.md](./docs/LESSON_FORMAT.md) &mdash; lesson JSON schema with examples.
- [docs/COMPONENTS.md](./docs/COMPONENTS.md) &mdash; React component map.

## Folder layout

```
.
|-- client/                React + Vite + Tailwind front-end
|   `-- src/
|       |-- api/           API abstraction layer
|       |-- audio/         Tone.js engine, metronome, pitch detection
|       |-- components/    Reusable UI (Fretboard, Layout, lessons, ui/)
|       |-- hooks/
|       |-- pages/         Route-level pages
|       |-- store/         Zustand stores (settings, progress, user)
|       `-- theory/        Pure-TS music theory engine
|-- server/                Express + better-sqlite3 API
|   `-- src/
|       |-- data/lessons/  Authored lesson JSON
|       |-- db/            schema.sql, migrate, seed
|       |-- routes/
|       `-- services/
|-- docs/
`-- package.json           workspace root
```

## Feature highlights

- Interactive SVG fretboard: scales, intervals, chords, animated patterns,
  multiple tunings, left-handed mode, optional note labels.
- Progressive lesson roadmap covering chords, rhythm, strumming, scales,
  ear training, and improvisation.
- Music theory module that always renders concepts on the fretboard.
- Practice engine with drills, chord-switch trainer, scale memorizer,
  metronome, and ear-training quizzes.
- Progress tracking: XP, levels, streaks, accuracy, weak-area detection.
- Audio: note/chord/scale playback (Tone.js), metronome, jam tracks,
  optional microphone pitch detection for note-matching exercises.
- AI-assisted: personalized practice routines, adaptive lesson
  recommendations, "Jam Coach" that suggests scales over a chord progression
  and explains why it works.

## Status

This repo ships an MVP. See [docs/ROADMAP.md](./docs/ROADMAP.md) for what is
shipped, what is partially scaffolded, and what is intentionally deferred.
