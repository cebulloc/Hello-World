import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { api } from "../api/endpoints";
import { Fretboard } from "../components/Fretboard/Fretboard";
import { useSettings } from "../store/settingsStore";

type Result = Awaited<ReturnType<typeof api.jamCoach>>;

export function JamCoach() {
  const { tuning, leftHanded, showNoteNames } = useSettings();
  const [progression, setProgression] = useState<string[]>(["Am", "G", "F", "E"]);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeScale, setActiveScale] = useState<string | null>(null);

  const add = () => {
    const v = input.trim();
    if (!v) return;
    setProgression((p) => [...p, v]);
    setInput("");
  };

  const remove = (i: number) =>
    setProgression((p) => p.filter((_, idx) => idx !== i));

  const submit = async () => {
    setLoading(true);
    try {
      const r = await api.jamCoach(progression);
      setResult(r);
      setActiveScale(r.scales[0]?.name ?? null);
    } finally {
      setLoading(false);
    }
  };

  const activeNotes = result?.scales.find((s) => s.name === activeScale)?.notes ?? [];

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-semibold">Jam Coach</h1>
      <Card>
        <div className="text-text-muted text-sm mb-2">Progression</div>
        <div className="flex flex-wrap gap-2 mb-3">
          {progression.map((c, i) => (
            <button
              key={`${c}-${i}`}
              onClick={() => remove(i)}
              className="px-3 py-1 rounded-lg bg-bg-elev border border-border hover:border-bad"
              title="click to remove"
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            placeholder="Add a chord, e.g. Am or G7"
            className="input flex-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Button variant="ghost" onClick={add}>
            Add
          </Button>
          <Button onClick={submit} disabled={loading || progression.length === 0}>
            {loading ? "Thinking..." : "Suggest scales"}
          </Button>
        </div>
      </Card>

      {result && (
        <>
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Badge tone="accent">Key</Badge>
              <span className="text-lg font-semibold">{result.key}</span>
            </div>
            <p className="text-text leading-relaxed">{result.explanation}</p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.scales.map((s) => (
              <button
                key={s.name}
                onClick={() => setActiveScale(s.name)}
                className={`text-left card p-4 transition-colors ${
                  activeScale === s.name ? "border-accent" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{s.name}</div>
                  <Badge tone={s.fitness >= 0.9 ? "good" : "default"}>
                    fit {Math.round(s.fitness * 100)}%
                  </Badge>
                </div>
                <div className="text-text-muted text-xs mt-1">
                  {s.notes.join(" ")}
                </div>
              </button>
            ))}
          </div>

          {activeNotes.length > 0 && (
            <Fretboard
              tuning={tuning}
              leftHanded={leftHanded}
              showNoteNames={showNoteNames}
              overlay={{ kind: "notes", tuning, notes: activeNotes }}
            />
          )}
        </>
      )}
    </div>
  );
}
