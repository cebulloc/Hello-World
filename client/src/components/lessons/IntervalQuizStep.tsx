import { useMemo, useState } from "react";
import type { LessonStep } from "../../api/endpoints";
import { useSettings } from "../../store/settingsStore";
import { Fretboard } from "../Fretboard/Fretboard";
import { Button } from "../ui/Button";
import { intervalByShort } from "../../theory/intervals";
import { fretNote } from "../../theory/fretboard";
import { TUNINGS, type TuningId } from "../../theory/tunings";
import { playNote } from "../../audio/engine";

interface Props {
  step: Extract<LessonStep, { kind: "intervalQuiz" }>;
  onScore: (score: number) => void;
}

interface Question {
  a: { stringIndex: number; fret: number; pitch: string };
  b: { stringIndex: number; fret: number; pitch: string };
  intervalShort: string;
}

function makeQuestion(pool: string[], tuning: TuningId): Question {
  const intervalShort = pool[Math.floor(Math.random() * pool.length)]!;
  const interval = intervalByShort(intervalShort)!;
  const tuningDef = TUNINGS[tuning] ?? TUNINGS.standard!;
  const stringIndex = Math.floor(Math.random() * Math.max(1, tuningDef.strings.length - 2));
  const fret = 1 + Math.floor(Math.random() * 7);
  const startNote = fretNote(tuning, stringIndex, fret);
  const targetMidi = startNote.midi + interval.semitones;
  for (let s = stringIndex; s < tuningDef.strings.length; s++) {
    for (let f = 0; f <= 14; f++) {
      const n = fretNote(tuning, s, f);
      if (n.midi === targetMidi && (s !== stringIndex || f !== fret)) {
        return {
          a: { stringIndex, fret, pitch: startNote.pitch },
          b: { stringIndex: s, fret: f, pitch: n.pitch },
          intervalShort,
        };
      }
    }
  }
  return makeQuestion(pool, tuning);
}

export function IntervalQuizStep({ step, onScore }: Props) {
  const { tuning, leftHanded } = useSettings();
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const questions = useMemo(
    () =>
      Array.from({ length: step.questions }, () =>
        makeQuestion(step.pool, tuning),
      ),
    [step.questions, step.pool, tuning],
  );

  const q = questions[idx]!;

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

  const playBoth = async () => {
    await playNote(q.a.pitch, 0.6);
    setTimeout(() => playNote(q.b.pitch, 0.6), 350);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-semibold">{step.title}</h3>
      <div className="text-text-muted text-sm">
        Question {idx + 1} / {questions.length} &middot; correct {correct}
      </div>
      <Fretboard
        tuning={tuning}
        leftHanded={leftHanded}
        showNoteNames={false}
        frets={12}
        overlay={{
          kind: "positions",
          tuning,
          positions: [
            { ...q.a, label: "1" },
            { ...q.b, label: "2" },
          ],
        }}
      />
      <div className="card p-4">
        <div className="text-sm text-text-muted mb-2 flex items-center gap-3 flex-wrap">
          <span>What interval is between note 1 and note 2?</span>
          <Button variant="ghost" onClick={playBoth}>
            Play notes
          </Button>
        </div>
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
          <div className="mt-3">
            <Button onClick={next}>Next question</Button>
          </div>
        )}
        {done && (
          <div className="mt-3 text-good text-sm">
            Quiz complete: {Math.round((correct / questions.length) * 100)}%.
            Tap Next to continue.
          </div>
        )}
      </div>
    </div>
  );
}

IntervalQuizStep.canAdvance = () => true;
