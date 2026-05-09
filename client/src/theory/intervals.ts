export interface Interval {
  short: string;
  long: string;
  semitones: number;
}

export const INTERVALS: Interval[] = [
  { short: "P1", long: "Perfect unison", semitones: 0 },
  { short: "m2", long: "Minor 2nd", semitones: 1 },
  { short: "M2", long: "Major 2nd", semitones: 2 },
  { short: "m3", long: "Minor 3rd", semitones: 3 },
  { short: "M3", long: "Major 3rd", semitones: 4 },
  { short: "P4", long: "Perfect 4th", semitones: 5 },
  { short: "TT", long: "Tritone", semitones: 6 },
  { short: "P5", long: "Perfect 5th", semitones: 7 },
  { short: "m6", long: "Minor 6th", semitones: 8 },
  { short: "M6", long: "Major 6th", semitones: 9 },
  { short: "m7", long: "Minor 7th", semitones: 10 },
  { short: "M7", long: "Major 7th", semitones: 11 },
  { short: "P8", long: "Perfect octave", semitones: 12 },
];

export function intervalBySemitones(semitones: number): Interval | null {
  return INTERVALS.find((i) => i.semitones === semitones) ?? null;
}

export function intervalByShort(short: string): Interval | null {
  return INTERVALS.find((i) => i.short === short) ?? null;
}
