# Wireframes

ASCII wireframes for the major screens. These describe layout and
information density rather than pixel-perfect design.

## Shell

A persistent left rail on desktop collapses to a bottom tab bar on mobile.
Top bar shows streak, XP progress to next level, and a settings affordance.

```
+-----------------------------------------------------------------+
| FretForge        streak: 7 d   XP: 1240 / 1800   [theme] [user] |
+----------+------------------------------------------------------+
|          |                                                      |
| Home     |                                                      |
| Lessons  |              <route content here>                    |
| Practice |                                                      |
| Theory   |                                                      |
| Jam      |                                                      |
| Settings |                                                      |
|          |                                                      |
+----------+------------------------------------------------------+
```

## Dashboard ("Home")

```
+-----------------------------------------------------------------+
| Welcome back, Alex                                              |
|                                                                 |
| +------------------+  +------------------+  +----------------+  |
| | Streak           |  | Weekly XP        |  | Weak area      |  |
| | 7 days           |  | [bar chart]      |  | Intervals 62%  |  |
| +------------------+  +------------------+  +----------------+  |
|                                                                 |
| Continue learning                                               |
| +-------------------------------------------------------------+ |
| | Pentatonic scale                                            | |
| | Track: scales   Difficulty: 2   8 mins                      | |
| | [ Resume -> ]                                               | |
| +-------------------------------------------------------------+ |
|                                                                 |
| Recommended for you                                             |
| [ card ] [ card ] [ card ]                                      |
+-----------------------------------------------------------------+
```

## Lesson list

Three-column track view on desktop, accordion on mobile.

```
+-----------------------------------------------------------------+
| Lessons                                                         |
|                                                                 |
| Chords        Rhythm        Scales                              |
| -----        ------        ------                               |
| [x] First    [x] Down      [x] Pentatonic                       |
| [x] Open    [ ] Up-down   [ ] Blues scale                       |
| [ ] Power   [ ] 16ths     [ ] Major                             |
| [ ] Barre   ...           ...                                   |
|                                                                 |
| Theory       Ear training   Improvisation                       |
+-----------------------------------------------------------------+
```

## Lesson view

A lesson is a stack of steps. Each step has its own renderer; navigation
is "Next step" / "Back". Progress bar at the top.

```
+-----------------------------------------------------------------+
| Pentatonic scale                          step 3 / 7   [ x ]    |
| [=====------------------]                                       |
+-----------------------------------------------------------------+
|                                                                 |
|  The minor pentatonic uses 5 notes per octave: 1 b3 4 5 b7.     |
|                                                                 |
|  +-----------------------------------------------------------+  |
|  |                  <SVG fretboard>                          |  |
|  |    o---o---o---o---o---o---o---o---o---o---o---o          |  |
|  |    o-(R)-o---o-(b3)-o-(4)-o---o-(5)-o---o-(b7)-o          |  |
|  |    ...                                                    |  |
|  +-----------------------------------------------------------+  |
|                                                                 |
|  [ Play scale ]   [ Animate ]   Tempo: 90 BPM                   |
|                                                                 |
|  [ <- Back ]                                       [ Next -> ]  |
+-----------------------------------------------------------------+
```

## Practice

Tabbed view: Drills | Metronome | Ear Training | Backing tracks.

```
+-----------------------------------------------------------------+
| Practice                                                        |
| [ Drills | Metronome | Ear training | Backing ]                 |
|                                                                 |
| Drill: G <-> Cadd9 chord switch         tempo 80 [ - / + ]      |
|                                                                 |
|        +-------------+      +-------------+                     |
|        |     G       |      |    Cadd9    |                     |
|        |  (chord     |      |  (chord     |                     |
|        |   diagram)  |      |   diagram)  |                     |
|        +-------------+      +-------------+                     |
|                                                                 |
|        Tap "next" on each click. Score: 18 / 24                 |
|        [ Start ]   [ Stop ]                                     |
+-----------------------------------------------------------------+
```

## Theory explorer

```
+-----------------------------------------------------------------+
| Theory                                                          |
| Concept: [ Scales v ]    Root: [ A ]   Type: [ Minor pent. ]    |
| Tuning: [ Standard v ]   [x] show note names  [ ] left-handed   |
|                                                                 |
| +-------------------------------------------------------------+ |
| |                  <Interactive fretboard>                    | |
| +-------------------------------------------------------------+ |
|                                                                 |
| Why these notes?                                                |
| The A minor pentatonic = A C D E G. It removes the 2nd and 6th  |
| from the natural minor to leave only the most "consonant"       |
| degrees over an Am chord, which is why it feels safe to noodle  |
| with over a minor blues. [ play scale ] [ play over Am loop ]   |
+-----------------------------------------------------------------+
```

## Jam Coach

```
+-----------------------------------------------------------------+
| Jam Coach                                                       |
|                                                                 |
| Progression: [ Am ] [ G ] [ F ] [ E ]    [ + add chord ]        |
| Tempo: 90    Feel: [ straight | shuffle ]                       |
|                                                                 |
| Suggested scales:                                               |
| 1. A natural minor  -- works because every chord is diatonic    |
|    to A minor except E (V), which uses the harmonic minor's G#. |
| 2. A minor pentatonic -- safer subset; great for melody.        |
| 3. A Phrygian dominant over the E -- explains the b2-3 tension. |
|                                                                 |
| [ Show on fretboard ]   [ Start backing track ]                 |
+-----------------------------------------------------------------+
```

## Settings

```
+-----------------------------------------------------------------+
| Settings                                                        |
|  Theme            (*) Dark   ( ) Light                          |
|  Handedness       (*) Right  ( ) Left                           |
|  Tuning           [ Standard EADGBE v ]                         |
|  Show note names  [x]                                           |
|  Default tempo    [ 90 ] BPM                                    |
|  Microphone       [ Enable for pitch detection ]                |
+-----------------------------------------------------------------+
```
