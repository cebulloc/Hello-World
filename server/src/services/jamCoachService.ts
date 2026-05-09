// Rule-based Jam Coach: given a chord progression, infer a likely key,
// rank candidate scales by how well they fit, and produce an explanation
// that actually references the chords the user gave us.
//
// This is intentionally not an LLM. Music theory at this level is rule-based,
// the rules are well known, and the result is more consistent than a model
// guessing.

const NOTE_TO_PC: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

const PC_TO_NOTE = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

interface ParsedChord {
  raw: string;
  rootPc: number;
  rootName: string;
  isMinor: boolean;
  isDominant: boolean;
}

function parseChord(raw: string): ParsedChord | null {
  const m = raw.match(/^([A-G][b#]?)(.*)$/);
  if (!m) return null;
  const root = m[1]!;
  const rest = m[2] ?? "";
  const rootPc = NOTE_TO_PC[root];
  if (rootPc === undefined) return null;
  const isMinor = /^m(?!aj)/.test(rest);
  const isDominant = /^7$|^9$|^11$|^13$/.test(rest);
  return { raw, rootPc, rootName: root, isMinor, isDominant };
}

const SCALE_INTERVALS: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  natural_minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
  major_pentatonic: [0, 2, 4, 7, 9],
  minor_pentatonic: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  phrygian_dominant: [0, 1, 4, 5, 7, 8, 10],
};

function notesOf(rootPc: number, scale: keyof typeof SCALE_INTERVALS) {
  return SCALE_INTERVALS[scale]!.map((i) => (rootPc + i) % 12);
}

function chordTones(c: ParsedChord): number[] {
  const r = c.rootPc;
  const third = c.isMinor ? (r + 3) % 12 : (r + 4) % 12;
  const fifth = (r + 7) % 12;
  const tones = [r, third, fifth];
  if (c.isDominant) tones.push((r + 10) % 12);
  return tones;
}

function fitness(scaleNotes: number[], chords: ParsedChord[]): number {
  // % of chord tones contained in the scale, averaged across the progression
  let acc = 0;
  for (const c of chords) {
    const tones = chordTones(c);
    const matched = tones.filter((t) => scaleNotes.includes(t)).length;
    acc += matched / tones.length;
  }
  return acc / chords.length;
}

function pcName(pc: number): string {
  return PC_TO_NOTE[pc] ?? "?";
}

export interface ScaleSuggestion {
  name: string;
  fitness: number;
  notes: string[];
}

export interface JamCoachResult {
  key: string;
  scales: ScaleSuggestion[];
  explanation: string;
}

export function suggestForProgression(
  progression: string[],
): JamCoachResult | null {
  const parsed = progression
    .map(parseChord)
    .filter((c): c is ParsedChord => c !== null);
  if (parsed.length === 0) return null;

  // Best key root: try every pitch class, score with major and natural_minor,
  // pick the (rootPc, mode) with the highest aggregate fitness.
  let bestRoot = parsed[0]!.rootPc;
  let bestMode: "major" | "natural_minor" = parsed[0]!.isMinor
    ? "natural_minor"
    : "major";
  let bestScore = -1;
  for (let r = 0; r < 12; r++) {
    for (const mode of ["major", "natural_minor"] as const) {
      const score = fitness(notesOf(r, mode), parsed);
      if (score > bestScore) {
        bestScore = score;
        bestRoot = r;
        bestMode = mode;
      }
    }
  }
  const keyName = `${pcName(bestRoot)} ${bestMode === "major" ? "major" : "minor"}`;

  // Score companion scales relative to that key root.
  const candidates: { key: keyof typeof SCALE_INTERVALS; label: string }[] =
    bestMode === "major"
      ? [
          { key: "major", label: `${pcName(bestRoot)} major` },
          {
            key: "major_pentatonic",
            label: `${pcName(bestRoot)} major pentatonic`,
          },
          { key: "mixolydian", label: `${pcName(bestRoot)} mixolydian` },
          { key: "blues", label: `${pcName(bestRoot)} blues` },
        ]
      : [
          { key: "natural_minor", label: `${pcName(bestRoot)} natural minor` },
          {
            key: "minor_pentatonic",
            label: `${pcName(bestRoot)} minor pentatonic`,
          },
          { key: "blues", label: `${pcName(bestRoot)} blues` },
          { key: "dorian", label: `${pcName(bestRoot)} dorian` },
          {
            key: "harmonic_minor",
            label: `${pcName(bestRoot)} harmonic minor`,
          },
        ];

  const scales: ScaleSuggestion[] = candidates
    .map((c) => ({
      name: c.label,
      fitness: Number(fitness(notesOf(bestRoot, c.key), parsed).toFixed(2)),
      notes: notesOf(bestRoot, c.key).map(pcName),
    }))
    .sort((a, b) => b.fitness - a.fitness);

  const diatonic = notesOf(bestRoot, bestMode);
  const outsiders = parsed.filter((c) => {
    const tones = chordTones(c);
    return !tones.every((t) => diatonic.includes(t));
  });
  const explanation = buildExplanation(
    keyName,
    bestRoot,
    bestMode,
    parsed,
    outsiders,
  );

  return { key: keyName, scales, explanation };
}

function buildExplanation(
  keyName: string,
  rootPc: number,
  mode: "major" | "natural_minor",
  chords: ParsedChord[],
  outsiders: ParsedChord[],
): string {
  const parts: string[] = [];
  parts.push(
    `The progression ${chords.map((c) => c.raw).join(" - ")} centers on ${keyName}.`,
  );
  if (outsiders.length === 0) {
    parts.push(
      "Every chord is diatonic to that key, so the parent scale is your safest melodic choice.",
    );
  } else {
    const labels = outsiders.map((c) => c.raw).join(", ");
    if (mode === "natural_minor") {
      const fifthPc = (rootPc + 7) % 12;
      const dominantOutsider = outsiders.find((c) => c.rootPc === fifthPc);
      if (dominantOutsider) {
        parts.push(
          `${dominantOutsider.raw} is the V chord; it borrows the leading tone from the harmonic minor, which is why ${pcName(rootPc)} harmonic minor (or ${pcName(fifthPc)} Phrygian dominant on that bar) sounds tighter than natural minor over ${dominantOutsider.raw}.`,
        );
      } else {
        parts.push(
          `${labels} introduces non-diatonic tones. Switch to a more colorful scale (Dorian, blues, or harmonic minor) on those bars.`,
        );
      }
    } else {
      parts.push(
        `${labels} pull outside the key. Mixolydian or the parent major's relative minor pentatonic typically resolve the tension.`,
      );
    }
  }
  parts.push(
    "Start with the pentatonic suggestion to nail safe targets, then add the full parent scale for color.",
  );
  return parts.join(" ");
}
