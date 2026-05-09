import { useEffect, useRef, useState } from "react";
import type { LessonStep } from "../../api/endpoints";
import { Button } from "../ui/Button";
import { ChordDiagram } from "../Fretboard/ChordDiagram";
import { OPEN_CHORD_SHAPES } from "../../theory/chords";
import { Metronome } from "../../audio/metronome";

interface Props {
  step: Extract<LessonStep, { kind: "chordTrainer" }>;
  onScore: (score: number) => void;
}

export function ChordTrainerStep({ step, onScore }: Props) {
  const [running, setRunning] = useState(false);
  const [tempo, setTempo] = useState(step.tempo);
  const [beat, setBeat] = useState(0);
  const [chordIndex, setChordIndex] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const total = step.bars * 4;
  const beatsRef = useRef(0);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const metronomeRef = useRef<Metronome | null>(null);

  useEffect(() => () => metronomeRef.current?.dispose(), []);

  const start = async () => {
    beatsRef.current = 0;
    hitsRef.current = 0;
    missesRef.current = 0;
    setBeat(0);
    setChordIndex(0);
    setHits(0);
    setMisses(0);
    const m = new Metronome({
      tempo,
      onTick: (b) => {
        setBeat(b);
        beatsRef.current += 1;
        if (beatsRef.current % 4 === 0) {
          setChordIndex((i) => (i + 1) % step.chords.length);
        }
        if (beatsRef.current >= total) {
          stop();
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
    if (beatsRef.current > 0) {
      const total = hitsRef.current + missesRef.current;
      const score = total > 0 ? hitsRef.current / total : 0.7;
      onScore(score);
    }
  };

  const markHit = () => {
    if (!running) return;
    hitsRef.current += 1;
    setHits(hitsRef.current);
  };
  const markMiss = () => {
    if (!running) return;
    missesRef.current += 1;
    setMisses(missesRef.current);
  };

  const current = step.chords[chordIndex] ?? step.chords[0]!;
  const next = step.chords[(chordIndex + 1) % step.chords.length] ?? "";
  const shape = OPEN_CHORD_SHAPES[current];
  const nextShape = OPEN_CHORD_SHAPES[next];

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-semibold">{step.title}</h3>
      <div className="flex items-center gap-4">
        <label className="text-sm flex items-center gap-2">
          Tempo
          <input
            type="number"
            min={40}
            max={200}
            value={tempo}
            onChange={(e) => {
              const v = Number(e.target.value);
              setTempo(v);
              metronomeRef.current?.setTempo(v);
            }}
            className="input w-20"
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
      <div className="grid grid-cols-2 gap-4">
        <div
          className={`card p-4 flex flex-col items-center gap-2 ${
            beat === 0 ? "flash" : ""
          }`}
        >
          <div className="text-text-muted text-xs uppercase">Now</div>
          {shape ? (
            <ChordDiagram
              name={current}
              frets={shape.frets}
              fingers={shape.fingers}
            />
          ) : (
            <div className="text-3xl font-semibold">{current}</div>
          )}
        </div>
        <div className="card p-4 flex flex-col items-center gap-2 opacity-70">
          <div className="text-text-muted text-xs uppercase">Next</div>
          {nextShape ? (
            <ChordDiagram
              name={next}
              frets={nextShape.frets}
              fingers={nextShape.fingers}
              size="sm"
            />
          ) : (
            <div className="text-2xl">{next}</div>
          )}
        </div>
      </div>
      {running && (
        <div className="flex gap-2">
          <Button onClick={markHit}>Got it</Button>
          <Button variant="ghost" onClick={markMiss}>
            Missed
          </Button>
        </div>
      )}
      <div className="text-text-muted text-sm">
        Hits: {hits} &middot; Misses: {misses} &middot; Beat: {beat + 1} / 4
      </div>
    </div>
  );
}
