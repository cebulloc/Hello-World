import type { LessonStep as Step } from "../../api/endpoints";
import { ProseStep } from "./ProseStep";
import { FretboardStep } from "./FretboardStep";
import { ChordTrainerStep } from "./ChordTrainerStep";
import { ScaleExerciseStep } from "./ScaleExerciseStep";
import { IntervalQuizStep } from "./IntervalQuizStep";
import { EarQuizStep } from "./EarQuizStep";
import { RhythmStep } from "./RhythmStep";

interface Props {
  step: Step;
  onScore: (score: number) => void;
}

export function LessonStep({ step, onScore }: Props) {
  switch (step.kind) {
    case "prose":
      return <ProseStep step={step} />;
    case "fretboard":
      return <FretboardStep step={step} />;
    case "chordTrainer":
      return <ChordTrainerStep step={step} onScore={onScore} />;
    case "scaleExercise":
      return <ScaleExerciseStep step={step} onScore={onScore} />;
    case "intervalQuiz":
      return <IntervalQuizStep step={step} onScore={onScore} />;
    case "earQuiz":
      return <EarQuizStep step={step} onScore={onScore} />;
    case "rhythm":
      return <RhythmStep step={step} onScore={onScore} />;
  }
}
