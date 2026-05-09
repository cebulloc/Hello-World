import { useMemo, useState } from "react";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { Button } from "../components/ui/Button";
import { Fretboard } from "../components/Fretboard/Fretboard";
import { useSettings } from "../store/settingsStore";
import { SCALES, scaleNotes } from "../theory/scales";
import { CHORD_FORMULAS, chordTones } from "../theory/chords";
import { SHARP_NAMES } from "../theory/notes";
import { playNote, playSequence } from "../audio/engine";

export function Theory() {
  const { tuning, leftHanded, showNoteNames } = useSettings();
  const [mode, setMode] = useState<"scale" | "chord" | "intervals">("scale");
  const [root, setRoot] = useState("A");
  const [scale, setScale] = useState("minor_pentatonic");
  const [chord, setChord] = useState("maj");

  const overlay = useMemo(() => {
    if (mode === "scale")
      return { kind: "scale" as const, tuning, root, scale };
    if (mode === "chord")
      return {
        kind: "notes" as const,
        tuning,
        notes: chordTones(root, chord),
      };
    return { kind: "none" as const };
  }, [mode, tuning, root, scale, chord]);

  const explanation =
    mode === "scale"
      ? scaleExplanation(root, scale)
      : mode === "chord"
        ? chordExplanation(root, chord)
        : "Click two frets on the fretboard above to compare them as an interval.";

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-semibold">Theory</h1>
      <Card>
        <div className="flex gap-3 flex-wrap items-end">
          <Select
            label="Concept"
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
            options={[
              { value: "scale", label: "Scale" },
              { value: "chord", label: "Chord" },
              { value: "intervals", label: "Intervals" },
            ]}
          />
          <Select
            label="Root"
            value={root}
            onChange={(e) => setRoot(e.target.value)}
            options={SHARP_NAMES.map((n) => ({ value: n, label: n }))}
          />
          {mode === "scale" && (
            <Select
              label="Scale"
              value={scale}
              onChange={(e) => setScale(e.target.value)}
              options={Object.values(SCALES).map((s) => ({
                value: s.id,
                label: s.label,
              }))}
            />
          )}
          {mode === "chord" && (
            <Select
              label="Chord"
              value={chord}
              onChange={(e) => setChord(e.target.value)}
              options={Object.values(CHORD_FORMULAS).map((c) => ({
                value: c.id,
                label: `${root} ${c.label}`,
              }))}
            />
          )}
          {mode === "scale" && (
            <Button
              variant="ghost"
              onClick={() =>
                playSequence(
                  scaleNotes(root, scale).map((n) => `${n.name}3`),
                  100,
                )
              }
            >
              Play scale
            </Button>
          )}
          {mode === "chord" && (
            <Button
              variant="ghost"
              onClick={() => {
                const tones = chordTones(root, chord);
                tones.forEach((t, i) =>
                  setTimeout(() => playNote(`${t}3`, 1.2), i * 60),
                );
              }}
            >
              Play chord
            </Button>
          )}
        </div>
      </Card>
      <Fretboard
        tuning={tuning}
        leftHanded={leftHanded}
        showNoteNames={showNoteNames}
        overlay={overlay}
        onFretClick={({ pitch }) => playNote(pitch)}
      />
      <Card>
        <h3 className="font-semibold mb-2">Why these notes?</h3>
        <p className="text-text leading-relaxed whitespace-pre-line">
          {explanation}
        </p>
      </Card>
    </div>
  );
}

function scaleExplanation(root: string, scaleId: string): string {
  const def = SCALES[scaleId];
  if (!def) return "";
  const notes = scaleNotes(root, scaleId);
  return [
    `${root} ${def.label} = ${notes.map((n) => n.name).join(" ")}.`,
    `Degrees: ${notes.map((n) => n.degree).join(" ")}.`,
    scaleHint(scaleId, root),
  ].join("\n");
}

function scaleHint(id: string, root: string): string {
  switch (id) {
    case "major":
      return `Sharps/flats are dictated by the W-W-H-W-W-W-H step pattern. ${root} major is the parent for its relative minor (${
        relativeMinor(root)
      } natural minor) -- same notes, different home.`;
    case "natural_minor":
      return `Same notes as the relative major (${
        relativeMajor(root)
      } major) but starting from the 6th degree. The b3, b6, b7 are what give the scale its sad/dark color.`;
    case "minor_pentatonic":
      return `Five-note subset of natural minor: 1 b3 4 5 b7. Removing the 2nd and b6 strips out the more dissonant tones, which is why this scale is the safest starting point for blues/rock soloing.`;
    case "major_pentatonic":
      return `Five-note subset of major: 1 2 3 5 6. No 4th or 7th means no half-step tension -- this is the brightest "everything sounds OK" sound, very country/folk.`;
    case "blues":
      return `Minor pentatonic + b5 ("blue note"). The b5 is unstable and resolves down to 4 or up to 5 -- always pass through it, don't camp on it.`;
    case "dorian":
      return `Minor scale with a natural 6 instead of b6. That single note swap gives Dorian its jazzy/funky feel; think "minor that doesn't sound sad".`;
    case "mixolydian":
      return `Major with a b7. Used by countless rock and blues riffs; the b7 lets you imply a dominant 7 chord against a major backing.`;
    case "harmonic_minor":
      return `Natural minor with a raised 7. The augmented 2nd between b6 and 7 produces the "Middle Eastern / classical minor" sound and turns the V chord into a real V7.`;
    default:
      return "";
  }
}

function relativeMinor(root: string): string {
  const idx = SHARP_NAMES.indexOf(root as (typeof SHARP_NAMES)[number]);
  return SHARP_NAMES[(idx + 9) % 12]!;
}

function relativeMajor(root: string): string {
  const idx = SHARP_NAMES.indexOf(root as (typeof SHARP_NAMES)[number]);
  return SHARP_NAMES[(idx + 3) % 12]!;
}

function chordExplanation(root: string, formulaId: string): string {
  const f = CHORD_FORMULAS[formulaId];
  if (!f) return "";
  const tones = chordTones(root, formulaId);
  const intervals = f.intervals
    .map((iv) => (iv === 0 ? "1" : iv === 4 ? "M3" : iv === 3 ? "m3" : iv === 7 ? "P5" : iv === 6 ? "b5" : iv === 8 ? "#5" : iv === 10 ? "b7" : iv === 11 ? "M7" : iv === 2 ? "M2" : iv === 5 ? "P4" : String(iv)))
    .join(" ");
  return [
    `${root} ${f.label} = ${tones.join(" ")} (intervals: ${intervals}).`,
    chordHint(formulaId),
  ].join("\n");
}

function chordHint(id: string): string {
  switch (id) {
    case "maj":
      return "Stack a major 3rd then a minor 3rd from the root. Bright and resolved.";
    case "min":
      return "Stack a minor 3rd then a major 3rd from the root. The lowered 3rd is the only difference from major and it's the entire reason it sounds 'sad.'";
    case "dom7":
      return "Major triad + b7. The dissonance between 3 and b7 (a tritone) is what gives V7 its 'pull' back to the I.";
    case "maj7":
      return "Major triad + M7. Lush and stable; the M7 a half-step below the root gives the 'jazzy' shimmer.";
    case "min7":
      return "Minor triad + b7. Smoother than a plain minor; standard for ii chords in jazz.";
    case "sus4":
      return "Replace the 3rd with the 4th. Suspended -- not major, not minor -- and tends to want to resolve down to a regular major or minor chord.";
    case "dim":
      return "Two stacked minor 3rds. Maximally tense, almost always functions as a passing or leading-tone chord.";
    case "aug":
      return "Two stacked major 3rds. Symmetrical and unstable; lifts a chord into the next.";
    default:
      return "";
  }
}
