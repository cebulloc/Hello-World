import { useMemo, useState } from "react";
import type { LessonStep } from "../../api/endpoints";
import { Button } from "../ui/Button";
import { intervalByShort } from "../../theory/intervals";
import { playSequence } from "../../audio/engine";
import { pitchFromMidi } from "../../theory/notes";

interface Props {
  step: Extract<LessonStep, { kind: "earQuiz" }>;
  onScore: (score: number) => void;
}

function pickQuestion(pool: string[]): { intervalShort: string; pitches: [string, string] } {
  const intervalShort = pool[Math.floor(Math.random() * pool.length)]!;
  const semis = intervalByShort(intervalShort)!.semitones;
  const baseMidi = 60 + Math.floor(Math.random() * 5); // around middle C
  return {
    intervalShort,
    pitches: [pitchFromMidi(baseMidi), pitchFromMidi(baseMidi + semis)],
  };
}

export function EarQuizStep({ step, onScore }: Props) {
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const questions = useMemo(
    () => Array.from({ length: step.questions }, () => pickQuestion(step.pool)),
    [step.questions, step.pool],
  );

  const q = questions[idx]!;

  const replay = () => playSequence([q.pitches[0], q.pitches[1]], 100, "4n");

  const submit = (choice: string) => {
    if (picked) return;
    setPicked(choice);
    if (choice === q.intervalShort) setCorrect((c) => c + 1);
  };

  const next = () => {
    if (idx + 1 >= questions.length) {
      setDone(true);
      onScore(correct / questions.length);
    } else {
      setIdx((i) => i + 1);
      setPicked(null);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-semibold">{step.title}</h3>
      <div className="text-text-muted text-sm">
        Question {idx + 1} / {questions.length} &middot; correct {correct}
      </div>
      <div className="card p-6 space-y-4">
        <Button variant="ghost" onClick={replay}>
          Play interval
        </Button>
        <div className="flex gap-2 flex-wrap">
          {step.pool.map((opt) => {
            const isAnswer = opt === q.intervalShort;
            const isPicked = picked === opt;
            return (
              <Button
                key={opt}
                variant={
                  picked
                    ? isAnswer
                      ? "primary"
                      : isPicked
                        ? "danger"
                        : "ghost"
                    : "ghost"
                }
                onClick={() => submit(opt)}
                disabled={!!picked}
              >
                {opt}
              </Button>
            );
          })}
        </div>
        {picked && !done && (
          <div>
            <Button onClick={next}>Next question</Button>
          </div>
        )}
        {done && (
          <div className="text-good text-sm">
            Quiz complete: {Math.round((correct / questions.length) * 100)}%.
            Tap Next to continue.
          </div>
        )}
      </div>
    </div>
  );
}

EarQuizStep.canAdvance = () => true;
