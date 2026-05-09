import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TuningId } from "../theory/tunings";

export interface AppSettings {
  tuning: TuningId;
  leftHanded: boolean;
  showNoteNames: boolean;
  defaultTempo: number;
  theme: "dark" | "light";
}

interface SettingsStore extends AppSettings {
  set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  hydrate: (incoming: Partial<AppSettings>) => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      tuning: "standard",
      leftHanded: false,
      showNoteNames: true,
      defaultTempo: 90,
      theme: "dark",
      set: (key, value) => set({ [key]: value } as Partial<AppSettings>),
      hydrate: (incoming) => set(incoming as Partial<AppSettings>),
    }),
    { name: "fretforge-settings" },
  ),
);
