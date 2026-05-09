import { useState } from "react";
import type { LessonStep } from "../../api/endpoints";
import { useSettings } from "../../store/settingsStore";
import { Fretboard } from "../Fretboard/Fretboard";
import { Button } from "../ui/Button";
import { playSequence } from "../../audio/engine";
import { scaleNotes } from "../../theory/scales";

interface Props {
  step: Extract<LessonStep, { kind: "scaleExercise" }>;
  onScore: (score: number) => void;
}

export function ScaleExerciseStep({ step, onScore }: Props) {
  const { tuning, leftHanded, showNoteNames } = useSettings();
  const [tempo, setTempo] = useState(step.tempo);
  const [reported, setReported] = useState(false);

  const play = async () => {
    const notes = scaleNotes(step.scale.root, step.scale.name);
    const pitches = [
      ...notes.map((n) => `${n.name}3`),
      `${notes[0]!.name}4`,
      ...[...notes].reverse().map((n) => `${n.name}3`),
    ];
    await playSequence(pitches, tempo, "8n");
  };

  const submit = (score: number) => {
    setReported(true);
    onScore(score);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-semibold">{step.title}</h3>
      <Fretboard
        tuning={tuning}
        leftHanded={leftHanded}
        showNoteNames={showNoteNames}
        overlay={{
          kind: "scale",
          tuning,
          root: step.scale.root,
          scale: step.scale.name,
        }}
      />
      <div className="flex items-center gap-4">
        <label className="text-sm flex items-center gap-2">
          Tempo
          <input
            type="number"
            min={40}
            max={200}
            value={tempo}
            onChange={(e) => setTempo(Number(e.target.value))}
            className="input w-20"
          />
        </label>
        <Button variant="ghost" onClick={play}>
          Play scale
        </Button>
      </div>
      <div className="card p-4 space-y-2">
        <div className="text-sm text-text-muted">
          Play along with the audio. When you're done, rate how it felt:
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { score: 0.4, label: "Struggled" },
            { score: 0.7, label: "Mostly there" },
            { score: 0.9, label: "Clean run" },
            { score: 1.0, label: "Nailed it" },
          ].map((opt) => (
            <Button
              key={opt.label}
              variant={reported ? "ghost" : "primary"}
              onClick={() => submit(opt.score)}
              disabled={reported}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        {reported && (
          <div className="text-sm text-good">Recorded. Tap Next to continue.</div>
        )}
      </div>
    </div>
  );
}

ScaleExerciseStep.canAdvance = () => true;
