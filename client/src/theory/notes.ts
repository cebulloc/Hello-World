export const SHARP_NAMES = [
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
] as const;

export const FLAT_NAMES = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

export type NoteName = (typeof SHARP_NAMES)[number] | (typeof FLAT_NAMES)[number];

const NAME_TO_PC: Record<string, number> = {
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

/** A pitch with octave, e.g. "E2", "A4". */
export type Pitch = string;

export function pitchClass(name: string): number {
  const pc = NAME_TO_PC[name];
  if (pc === undefined) throw new Error(`Unknown note: ${name}`);
  return pc;
}

export function nameOfPc(pc: number, prefer: "sharp" | "flat" = "sharp"): string {
  const wrapped = ((pc % 12) + 12) % 12;
  return (prefer === "sharp" ? SHARP_NAMES : FLAT_NAMES)[wrapped]!;
}

export function midi(pitch: Pitch): number {
  const m = pitch.match(/^([A-G][b#]?)(-?\d+)$/);
  if (!m) throw new Error(`Bad pitch: ${pitch}`);
  const pc = pitchClass(m[1]!);
  const octave = Number(m[2]!);
  // MIDI: C-1 = 0, so C4 = 60
  return (octave + 1) * 12 + pc;
}

export function pitchFromMidi(value: number): Pitch {
  const pc = ((value % 12) + 12) % 12;
  const octave = Math.floor(value / 12) - 1;
  return `${nameOfPc(pc)}${octave}`;
}
