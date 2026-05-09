# Roadmap

Status legend: [x] shipped in MVP, [~] partial / scaffolded, [ ] planned.

## MVP (this repo)

### Theory engine
- [x] Notes, enharmonic equivalents, octave math
- [x] Intervals (name <-> semitones, quality)
- [x] Scales (major, natural minor, pentatonic major/minor, blues, modes)
- [x] Triad and seventh chord construction by formula
- [x] Tunings (standard, drop-D, DADGAD, half-step down, open G)
- [x] Fretboard math: note at (string, fret), positions of a pitch class

### Fretboard component
- [x] SVG renderer, 24 frets, configurable
- [x] Overlay system: notes, intervals, chord shapes, scale patterns
- [x] Left-handed mode
- [x] Optional note labels
- [x] Click a fret to play and report the note
- [~] Animated scale traversal (basic, no easing curves yet)

### Lessons
- [x] Lesson JSON schema and loader
- [x] Step renderers: prose, fretboard exercise, chord trainer,
      ear-training quiz, rhythm pattern
- [x] Seven authored lessons:
  - First open chords
  - Power chords
  - Pentatonic scale (minor)
  - Understanding intervals
  - Building major chords
  - 12-bar blues
  - Improvisation basics

### Practice engine
- [x] Metronome (Tone.Transport)
- [x] Chord-switch drill (timed)
- [x] Scale memorization drill
- [x] Interval recognition (visual + audio)
- [x] Ear-training quiz (interval ear ID)
- [~] Backing tracks (one demo loop wired, more is content work)

### Progression
- [x] XP, levels, streak
- [x] Per-lesson completion + accuracy
- [x] Weak-area detection (lowest accuracy bucket)
- [x] Next-lesson recommendation

### AI-assisted
- [x] Rule-based personalized practice routine
- [x] Rule-based adaptive lesson recommendation
- [x] Rule-based Jam Coach (scales over progression + explanation)
- [~] LLM provider hook present but disabled by default

### UI/UX
- [x] Dark mode (default)
- [x] Responsive layout (mobile-first)
- [x] Dashboard with streak, XP, weak areas, next lesson
- [x] Theory explorer page with fretboard
- [x] Settings page (tuning, handedness, labels)

## v1 (post-MVP)

- [ ] Email/password auth, multi-user
- [ ] Postgres adapter behind the `db/client.ts` interface
- [ ] Component test coverage with React Testing Library
- [ ] More lessons: barre chords, CAGED system, modes deep dive,
      fingerpicking
- [ ] Polished animation pass (motion curves, scale-pattern traversal)
- [ ] Pitch detection promoted from optional to a first-class lesson mode
- [ ] LLM-backed Jam Coach behind a server-side feature flag

## Stretch

- [ ] MIDI input (Web MIDI) for chord/note recognition
- [ ] Tab and standard notation rendering (VexFlow / abcjs)
- [ ] AI-generated jam tracks (Tone.js + chord-progression generator)
- [ ] Social: friends, weekly challenges, leaderboards
- [ ] Song-learning mode (user uploads or links a chord chart)
- [ ] Spotify / YouTube embed for backing tracks
- [ ] Native mobile shell via Capacitor
