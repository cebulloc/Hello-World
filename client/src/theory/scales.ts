import { nameOfPc, pitchClass } from "./notes";

export interface ScaleDefinition {
  id: string;
  label: string;
  intervals: number[]; // semitones from root
  /** Optional degree labels per interval index ("1","b3", etc.) */
  degrees?: string[];
}

export const SCALES: Record<string, ScaleDefinition> = {
  major: {
    id: "major",
    label: "Major",
    intervals: [0, 2, 4, 5, 7, 9, 11],
    degrees: ["1", "2", "3", "4", "5", "6", "7"],
  },
  natural_minor: {
    id: "natural_minor",
    label: "Natural minor",
    intervals: [0, 2, 3, 5, 7, 8, 10],
    degrees: ["1", "2", "b3", "4", "5", "b6", "b7"],
  },
  harmonic_minor: {
    id: "harmonic_minor",
    label: "Harmonic minor",
    intervals: [0, 2, 3, 5, 7, 8, 11],
    degrees: ["1", "2", "b3", "4", "5", "b6", "7"],
  },
  major_pentatonic: {
    id: "major_pentatonic",
    label: "Major pentatonic",
    intervals: [0, 2, 4, 7, 9],
    degrees: ["1", "2", "3", "5", "6"],
  },
  minor_pentatonic: {
    id: "minor_pentatonic",
    label: "Minor pentatonic",
    intervals: [0, 3, 5, 7, 10],
    degrees: ["1", "b3", "4", "5", "b7"],
  },
  blues: {
    id: "blues",
    label: "Blues (minor)",
    intervals: [0, 3, 5, 6, 7, 10],
    degrees: ["1", "b3", "4", "b5", "5", "b7"],
  },
  dorian: {
    id: "dorian",
    label: "Dorian",
    intervals: [0, 2, 3, 5, 7, 9, 10],
    degrees: ["1", "2", "b3", "4", "5", "6", "b7"],
  },
  mixolydian: {
    id: "mixolydian",
    label: "Mixolydian",
    intervals: [0, 2, 4, 5, 7, 9, 10],
    degrees: ["1", "2", "3", "4", "5", "6", "b7"],
  },
};

export interface ScaleNote {
  pc: number;
  name: string;
  degree: string;
}

export function scaleNotes(rootName: string, scaleId: string): ScaleNote[] {
  const def = SCALES[scaleId];
  if (!def) throw new Error(`Unknown scale: ${scaleId}`);
  const root = pitchClass(rootName);
  return def.intervals.map((iv, idx) => {
    const pc = (root + iv) % 12;
    return {
      pc,
      name: nameOfPc(pc),
      degree: def.degrees?.[idx] ?? String(idx + 1),
    };
  });
}

export function scalePitchClasses(rootName: string, scaleId: string): number[] {
  return scaleNotes(rootName, scaleId).map((n) => n.pc);
}
