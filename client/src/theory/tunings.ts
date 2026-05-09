/**
 * A tuning is the open-string pitches of strings 6..1 (low E to high E).
 */
export interface TuningDef {
  id: string;
  label: string;
  /** Open string pitches, low to high (string 6 first). */
  strings: string[];
}

export const TUNINGS: Record<string, TuningDef> = {
  standard: {
    id: "standard",
    label: "Standard (E A D G B E)",
    strings: ["E2", "A2", "D3", "G3", "B3", "E4"],
  },
  drop_d: {
    id: "drop_d",
    label: "Drop D (D A D G B E)",
    strings: ["D2", "A2", "D3", "G3", "B3", "E4"],
  },
  half_step_down: {
    id: "half_step_down",
    label: "Half step down (Eb)",
    strings: ["Eb2", "Ab2", "Db3", "Gb3", "Bb3", "Eb4"],
  },
  open_g: {
    id: "open_g",
    label: "Open G (D G D G B D)",
    strings: ["D2", "G2", "D3", "G3", "B3", "D4"],
  },
  dadgad: {
    id: "dadgad",
    label: "DADGAD",
    strings: ["D2", "A2", "D3", "G3", "A3", "D4"],
  },
};

export type TuningId = keyof typeof TUNINGS;
