import { midi, nameOfPc, pitchFromMidi } from "./notes";
import { TUNINGS, type TuningId } from "./tunings";

export interface FretPosition {
  /** 0 = string 6 (lowest), 5 = string 1 (highest) */
  stringIndex: number;
  fret: number;
}

export interface FretNote extends FretPosition {
  midi: number;
  pitch: string;
  pc: number;
  noteName: string;
}

export function fretNote(
  tuning: TuningId,
  stringIndex: number,
  fret: number,
): FretNote {
  const tuningDef = TUNINGS[tuning] ?? TUNINGS.standard!;
  const open = tuningDef.strings[stringIndex];
  if (!open) throw new Error(`Bad string index: ${stringIndex}`);
  const m = midi(open) + fret;
  const pitch = pitchFromMidi(m);
  const pc = m % 12;
  return {
    stringIndex,
    fret,
    midi: m,
    pitch,
    pc,
    noteName: nameOfPc(pc),
  };
}

/**
 * Find every position where the given pitch classes appear on the
 * fretboard within [0, maxFret].
 */
export function findPositions(
  tuning: TuningId,
  pitchClasses: number[],
  maxFret = 12,
): FretNote[] {
  const tuningDef = TUNINGS[tuning] ?? TUNINGS.standard!;
  const out: FretNote[] = [];
  for (let s = 0; s < tuningDef.strings.length; s++) {
    for (let f = 0; f <= maxFret; f++) {
      const note = fretNote(tuning, s, f);
      if (pitchClasses.includes(note.pc)) out.push(note);
    }
  }
  return out;
}
