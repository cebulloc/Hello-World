import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { useSettings } from "../store/settingsStore";
import { useUser } from "../store/userStore";
import { TUNINGS } from "../theory/tunings";
import { api } from "../api/endpoints";

export function Settings() {
  const settings = useSettings();
  const user = useUser((s) => s.user);

  const persist = async (
    patch: Partial<{
      tuning: string;
      leftHanded: boolean;
      showNoteNames: boolean;
      defaultTempo: number;
      theme: "dark" | "light";
    }>,
  ) => {
    if (!user) return;
    try {
      await api.updateSettings(user.id, patch);
    } catch {
      // best effort; local state is the source of truth in MVP
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Select
            label="Tuning"
            value={settings.tuning}
            onChange={(e) => {
              settings.set("tuning", e.target.value as never);
              persist({ tuning: e.target.value });
            }}
            options={Object.values(TUNINGS).map((t) => ({
              value: t.id,
              label: t.label,
            }))}
          />
          <Select
            label="Handedness"
            value={settings.leftHanded ? "left" : "right"}
            onChange={(e) => {
              const v = e.target.value === "left";
              settings.set("leftHanded", v);
              persist({ leftHanded: v });
            }}
            options={[
              { value: "right", label: "Right-handed" },
              { value: "left", label: "Left-handed" },
            ]}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.showNoteNames}
              onChange={(e) => {
                settings.set("showNoteNames", e.target.checked);
                persist({ showNoteNames: e.target.checked });
              }}
            />
            Show note names on fretboard
          </label>
          <label className="text-sm flex flex-col gap-1">
            <span className="text-text-muted">Default tempo</span>
            <input
              type="number"
              min={40}
              max={200}
              value={settings.defaultTempo}
              onChange={(e) => {
                const v = Number(e.target.value);
                settings.set("defaultTempo", v);
                persist({ defaultTempo: v });
              }}
              className="input w-32"
            />
          </label>
        </div>
      </Card>
    </div>
  );
}
