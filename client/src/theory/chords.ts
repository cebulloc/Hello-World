import { nameOfPc, pitchClass } from "./notes";

export interface ChordFormula {
  id: string;
  label: string;
  intervals: number[];
}

export const CHORD_FORMULAS: Record<string, ChordFormula> = {
  maj: { id: "maj", label: "major", intervals: [0, 4, 7] },
  min: { id: "min", label: "minor", intervals: [0, 3, 7] },
  dim: { id: "dim", label: "diminished", intervals: [0, 3, 6] },
  aug: { id: "aug", label: "augmented", intervals: [0, 4, 8] },
  sus2: { id: "sus2", label: "sus2", intervals: [0, 2, 7] },
  sus4: { id: "sus4", label: "sus4", intervals: [0, 5, 7] },
  maj7: { id: "maj7", label: "major 7", intervals: [0, 4, 7, 11] },
  min7: { id: "min7", label: "minor 7", intervals: [0, 3, 7, 10] },
  dom7: { id: "dom7", label: "dominant 7", intervals: [0, 4, 7, 10] },
  m7b5: { id: "m7b5", label: "half-diminished 7", intervals: [0, 3, 6, 10] },
};

export function chordTones(rootName: string, formulaId: string): string[] {
  const f = CHORD_FORMULAS[formulaId];
  if (!f) throw new Error(`Unknown chord: ${formulaId}`);
  const root = pitchClass(rootName);
  return f.intervals.map((iv) => nameOfPc((root + iv) % 12));
}

/** Common open-position chord shapes used by the UI when name is given. */
export const OPEN_CHORD_SHAPES: Record<
  string,
  { frets: number[]; fingers: number[] }
> = {
  // strings 6..1, -1 = mute, 0 = open
  E: { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  Em: { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  A: { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  Am: { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  D: { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  Dm: { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  C: { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  G: { frets: [3, 2, 0, 0, 0, 3], fingers: [3, 2, 0, 0, 0, 4] },
  Cadd9: { frets: [-1, 3, 2, 0, 3, 3], fingers: [0, 2, 1, 0, 3, 4] },
  F: { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1] },
  A7: { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] },
  D7: { frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
  E7: { frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
  E5: { frets: [0, 2, -1, -1, -1, -1], fingers: [0, 2, 0, 0, 0, 0] },
  A5: { frets: [-1, 0, 2, -1, -1, -1], fingers: [0, 0, 2, 0, 0, 0] },
  D5: { frets: [-1, -1, 0, 2, 3, -1], fingers: [0, 0, 0, 1, 3, 0] },
};
