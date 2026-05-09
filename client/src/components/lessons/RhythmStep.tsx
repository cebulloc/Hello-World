import { useEffect, useRef, useState } from "react";
import type { LessonStep } from "../../api/endpoints";
import { Button } from "../ui/Button";
import { Metronome } from "../../audio/metronome";

interface Props {
  step: Extract<LessonStep, { kind: "rhythm" }>;
  onScore: (score: number) => void;
}

export function RhythmStep({ step, onScore }: Props) {
  const [tempo, setTempo] = useState(step.tempo);
  const [running, setRunning] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [elapsedBeats, setElapsedBeats] = useState(0);
  const metronomeRef = useRef<Metronome | null>(null);
  const totalEighths = step.bars * 8;

  useEffect(() => () => metronomeRef.current?.dispose(), []);

  const start = async () => {
    setActiveIndex(-1);
    setElapsedBeats(0);
    let eighth = 0;
    const m = new Metronome({
      tempo: tempo * 2, // count eighths
      onTick: () => {
        const i = eighth % step.pattern.length;
        setActiveIndex(i);
        eighth++;
        setElapsedBeats(eighth);
        if (eighth >= totalEighths) {
          stop();
          onScore(0.9); // self-paced; assume good if completed
        }
      },
    });
    metronomeRef.current = m;
    await m.start();
    setRunning(true);
  };

  const stop = () => {
    metronomeRef.current?.stop();
    metronomeRef.current?.dispose();
    metronomeRef.current = null;
    setRunning(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-semibold">{step.title}</h3>
      <div className="flex items-center gap-3">
        <label className="text-sm flex items-center gap-2">
          Tempo
          <input
            type="number"
            min={40}
            max={200}
            value={tempo}
            onChange={(e) => setTempo(Number(e.target.value))}
            className="input w-20"
            disabled={running}
          />
        </label>
        {!running ? (
          <Button onClick={start}>Start</Button>
        ) : (
          <Button variant="danger" onClick={stop}>
            Stop
          </Button>
        )}
      </div>
      <div className="card p-4">
        <div className="flex gap-1 flex-wrap">
          {step.pattern.map((p, i) => {
            const isActive = i === activeIndex;
            return (
              <div
                key={i}
                className={`w-9 h-9 grid place-items-center rounded-md border ${
                  p === "X" ? "border-accent text-accent" : "border-border text-text-muted"
                } ${isActive ? "bg-accent/30" : ""}`}
              >
                {p === "X" ? "v" : "."}
              </div>
            );
          })}
        </div>
        <div className="text-text-muted text-xs mt-2">
          v = strum down/up, . = rest. Bars: {step.bars}.
        </div>
      </div>
      <div className="text-text-muted text-sm">
        Eighths played: {elapsedBeats} / {totalEighths}
      </div>
    </div>
  );
}

RhythmStep.canAdvance = () => true;
