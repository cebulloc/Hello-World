import { findPositions, fretNote } from "../../theory/fretboard";
import { scaleNotes } from "../../theory/scales";
import { pitchClass } from "../../theory/notes";
import type { TuningId } from "../../theory/tunings";

export interface FretMarker {
  stringIndex: number;
  fret: number;
  label: string;
  emphasis?: "root" | "normal" | "highlight";
}

export type FretboardOverlay =
  | { kind: "none" }
  | {
      kind: "scale";
      tuning: TuningId;
      root: string;
      scale: string;
      maxFret?: number;
    }
  | {
      kind: "notes";
      tuning: TuningId;
      notes: string[];
      maxFret?: number;
    }
  | {
      kind: "chord";
      /** strings 6..1; -1 = mute, 0 = open, n = fret */
      frets: number[];
      fingers?: number[];
      tuning: TuningId;
    }
  | {
      kind: "positions";
      tuning: TuningId;
      positions: { stringIndex: number; fret: number; label?: string }[];
    };

export function overlayMarkers(o: FretboardOverlay): FretMarker[] {
  switch (o.kind) {
    case "none":
      return [];
    case "scale": {
      const notes = scaleNotes(o.root, o.scale);
      const pcs = notes.map((n) => n.pc);
      const positions = findPositions(o.tuning, pcs, o.maxFret ?? 12);
      const rootPc = pitchClass(o.root);
      const labelByPc = new Map(notes.map((n) => [n.pc, n.degree]));
      return positions.map((p) => ({
        stringIndex: p.stringIndex,
        fret: p.fret,
        label: labelByPc.get(p.pc) ?? p.noteName,
        emphasis: p.pc === rootPc ? "root" : "normal",
      }));
    }
    case "notes": {
      const pcs = o.notes.map(pitchClass);
      const positions = findPositions(o.tuning, pcs, o.maxFret ?? 12);
      return positions.map((p) => ({
        stringIndex: p.stringIndex,
        fret: p.fret,
        label: p.noteName,
        emphasis: "normal",
      }));
    }
    case "chord": {
      const out: FretMarker[] = [];
      o.frets.forEach((fret, idx) => {
        const stringIndex = idx; // diagram string 6..1 == index 0..5
        if (fret < 0) return; // muted
        const note = fretNote(o.tuning, stringIndex, fret);
        out.push({
          stringIndex,
          fret,
          label: o.fingers?.[idx]
            ? String(o.fingers[idx])
            : note.noteName,
          emphasis: "highlight",
        });
      });
      return out;
    }
    case "positions": {
      return o.positions.map((p) => {
        const note = fretNote(o.tuning, p.stringIndex, p.fret);
        return {
          stringIndex: p.stringIndex,
          fret: p.fret,
          label: p.label ?? note.noteName,
          emphasis: "highlight",
        };
      });
    }
  }
}
