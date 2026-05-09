import type { LessonStep } from "../../api/endpoints";
import { useSettings } from "../../store/settingsStore";
import { Fretboard } from "../Fretboard/Fretboard";
import { ChordDiagram } from "../Fretboard/ChordDiagram";
import { Button } from "../ui/Button";
import { OPEN_CHORD_SHAPES } from "../../theory/chords";
import { playNote, playSequence } from "../../audio/engine";
import { fretNote } from "../../theory/fretboard";
import { scaleNotes } from "../../theory/scales";

interface Props {
  step: Extract<LessonStep, { kind: "fretboard" }>;
}

export function FretboardStep({ step }: Props) {
  const { tuning, leftHanded, showNoteNames } = useSettings();
  const d = step.diagram;

  const playChord = async () => {
    const frets = d.frets ?? OPEN_CHORD_SHAPES[d.name ?? ""]?.frets;
    if (!frets) return;
    const pitches = frets
      .map((f, i) => (f < 0 ? null : fretNote(tuning, i, f).pitch))
      .filter((x): x is string => x !== null);
    for (const [i, p] of pitches.entries()) {
      setTimeout(() => playNote(p, 0.5), i * 90);
    }
  };

  const playScale = async () => {
    if (!d.scale) return;
    const pcs = scaleNotes(d.scale.root, d.scale.name);
    const pitches = pcs.map((n) => `${n.name}3`);
    pitches.push(`${pcs[0]!.name}4`);
    await playSequence(pitches, 90, "8n");
  };

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-semibold">{step.title}</h3>
      <p className="text-text leading-relaxed whitespace-pre-line">{step.body}</p>
      <div className="flex flex-col md:flex-row gap-4 items-start">
        {d.kind === "chord" && d.frets && (
          <ChordDiagram name={d.name} frets={d.frets} fingers={d.fingers} />
        )}
        <div className="flex-1 w-full">
          <Fretboard
            tuning={tuning}
            leftHanded={leftHanded}
            showNoteNames={showNoteNames}
            overlay={
              d.kind === "scale" && d.scale
                ? {
                    kind: "scale",
                    tuning,
                    root: d.scale.root,
                    scale: d.scale.name,
                  }
                : d.kind === "chord" && d.frets
                  ? { kind: "chord", tuning, frets: d.frets, fingers: d.fingers }
                  : d.kind === "notes" && d.notes
                    ? { kind: "notes", tuning, notes: d.notes }
                    : { kind: "none" }
            }
          />
        </div>
      </div>
      <div className="flex gap-2">
        {d.kind === "chord" && (
          <Button variant="ghost" onClick={playChord}>
            Play chord
          </Button>
        )}
        {d.kind === "scale" && (
          <Button variant="ghost" onClick={playScale}>
            Play scale
          </Button>
        )}
      </div>
    </div>
  );
}

FretboardStep.canAdvance = () => true;
FretboardStep.scoreOnAdvance = () => 1;
