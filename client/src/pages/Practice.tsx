import { useEffect, useRef, useState } from "react";
import { Tabs } from "../components/ui/Tabs";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Metronome } from "../audio/metronome";
import { useUser } from "../store/userStore";
import { api } from "../api/endpoints";

const TABS = [
  { id: "metronome", label: "Metronome" },
  { id: "drills", label: "Drills" },
  { id: "ear", label: "Ear training" },
  { id: "routine", label: "Routine" },
];

export function Practice() {
  const [active, setActive] = useState("metronome");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Practice</h1>
      <Tabs tabs={TABS} active={active} onChange={setActive}>
        {active === "metronome" && <MetronomePanel />}
        {active === "drills" && <DrillsPanel />}
        {active === "ear" && <EarPanel />}
        {active === "routine" && <RoutinePanel />}
      </Tabs>
    </div>
  );
}

function MetronomePanel() {
  const [tempo, setTempo] = useState(90);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(0);
  const m = useRef<Metronome | null>(null);

  useEffect(() => () => m.current?.dispose(), []);

  const start = async () => {
    const inst = new Metronome({ tempo, onTick: setBeat });
    m.current = inst;
    await inst.start();
    setRunning(true);
  };
  const stop = () => {
    m.current?.stop();
    m.current?.dispose();
    m.current = null;
    setRunning(false);
  };
  return (
    <Card>
      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm flex items-center gap-2">
          Tempo
          <input
            type="number"
            min={40}
            max={240}
            value={tempo}
            onChange={(e) => {
              const v = Number(e.target.value);
              setTempo(v);
              m.current?.setTempo(v);
            }}
            className="input w-24"
          />
        </label>
        {!running ? (
          <Button onClick={start}>Start</Button>
        ) : (
          <Button variant="danger" onClick={stop}>
            Stop
          </Button>
        )}
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i === beat
                  ? i === 0
                    ? "bg-accent"
                    : "bg-good"
                  : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

function DrillsPanel() {
  const drills = [
    { id: "chord-switch-G-Cadd9", label: "G to Cadd9 chord switch" },
    { id: "chord-switch-Em-Am-D", label: "Em / Am / D rotation" },
    { id: "scale-memo-Am-pent", label: "A minor pentatonic, position 1" },
    { id: "interval-id-basic", label: "Visual interval ID" },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {drills.map((d) => (
        <Card key={d.id}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">{d.label}</div>
              <div className="text-xs text-text-muted">drill: {d.id}</div>
            </div>
            <Badge>tap to start in lesson</Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}

function EarPanel() {
  return (
    <Card>
      <div className="space-y-2">
        <div className="font-medium">Ear training</div>
        <div className="text-text-muted text-sm">
          The ear-training quizzes live inside lessons (see "Understanding
          intervals" and "Improvisation basics"). A standalone trainer is on
          the v1 roadmap.
        </div>
      </div>
    </Card>
  );
}

function RoutinePanel() {
  const user = useUser((s) => s.user);
  const [routine, setRoutine] =
    useState<Awaited<ReturnType<typeof api.practiceRoutine>> | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    if (!user) return;
    setLoading(true);
    try {
      setRoutine(await api.practiceRoutine(user.id, 15));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={fetch} disabled={loading}>
          Generate 15-minute routine
        </Button>
        {loading && <div className="text-text-muted text-sm">Thinking...</div>}
      </div>
      {routine && (
        <div className="space-y-3">
          {routine.blocks.map((b, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{b.title}</div>
                  <div className="text-xs text-text-muted">
                    {b.kind}
                    {b.tempo ? ` @ ${b.tempo} BPM` : ""}
                  </div>
                </div>
                <Badge tone="accent">{b.duration} min</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
