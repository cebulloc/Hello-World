# Component map

A tour of the key React components and what each one is responsible for.

## Layout

- `components/Layout/AppShell.tsx` &mdash; top bar + side nav + outlet.
- `components/Layout/SideNav.tsx` &mdash; nav links with active highlighting.
- `components/Layout/TopBar.tsx` &mdash; brand, streak chip, XP bar, theme toggle.

## Design system primitives (`components/ui/`)

- `Button.tsx` &mdash; variants: primary, ghost, danger.
- `Card.tsx`, `Stat.tsx`, `Badge.tsx`, `ProgressBar.tsx`.
- `Tabs.tsx` &mdash; controlled tabs used by Practice and Theory pages.
- `Select.tsx` &mdash; styled native select.

These are intentionally small. They wrap Tailwind utility classes so pages
do not repeat long class strings. No heavy UI library.

## Fretboard (`components/Fretboard/`)

- `Fretboard.tsx` &mdash; the SVG fretboard. Props:
  - `tuning: TuningId`
  - `frets: number` (default 12)
  - `leftHanded?: boolean`
  - `showNoteNames?: boolean`
  - `overlay: FretboardOverlay`
  - `onFretClick?: (string, fret) => void`

- `overlays.ts` &mdash; pure helpers that turn theory objects (a scale, a chord,
  a custom note set) into the dot-positions the SVG draws.

- `ChordDiagram.tsx` &mdash; small chord shape diagram used in lesson steps and
  the chord-switch trainer. Independent from the full fretboard for layout
  flexibility.

## Audio (`audio/`)

Not React components, but consumed by hooks:

- `engine.ts` &mdash; lazily creates a Tone.js polysynth, exposes
  `playNote`, `playChord`, `playScale`.
- `metronome.ts` &mdash; start/stop/setTempo, emits an "onClick" callback so the
  UI can flash.
- `pitchDetect.ts` &mdash; YIN-based mic pitch detection (opt-in).

## Hooks (`hooks/`)

- `useFretboardSettings()` &mdash; reads tuning/handedness/labels from settings
  store; convenience for components that need a snapshot.
- `useMetronome(tempo)` &mdash; manages a metronome instance with cleanup.
- `useLesson(lessonId)` &mdash; loads a lesson, owns `currentStep`, exposes
  `next`, `prev`, `complete(accuracy)`.
- `useProgress()` &mdash; the dashboard data fetcher.

## Lesson step renderers (`components/lessons/`)

One file per `step.kind` so it's obvious where to add a new kind.

- `ProseStep.tsx`
- `FretboardStep.tsx`
- `ChordTrainerStep.tsx`
- `ScaleExerciseStep.tsx`
- `IntervalQuizStep.tsx`
- `EarQuizStep.tsx`
- `RhythmStep.tsx`

`LessonStep.tsx` is a tiny dispatcher that picks the right renderer from
`step.kind`.

## Pages (`pages/`)

- `Dashboard.tsx` &mdash; streak, XP, weak areas, "continue learning",
  recommended cards.
- `LessonList.tsx` &mdash; track view with completion checkmarks.
- `LessonView.tsx` &mdash; renders the active lesson via `LessonStep`.
- `Practice.tsx` &mdash; tabbed: drills, metronome, ear training, backing.
- `Theory.tsx` &mdash; concept picker driving the fretboard.
- `JamCoach.tsx` &mdash; chord progression builder, suggested scales.
- `Settings.tsx` &mdash; tuning, handedness, labels, theme.

## Stores (`store/`)

- `settingsStore.ts` &mdash; persisted Zustand store for UI prefs.
- `userStore.ts` &mdash; demo user + auth shim.
- `progressStore.ts` &mdash; dashboard cache; hydrated by `useProgress`.
