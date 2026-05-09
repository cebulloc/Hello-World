import { useUser } from "../../store/userStore";
import { Badge } from "../ui/Badge";
import { ProgressBar } from "../ui/ProgressBar";

function xpToNextLevel(xp: number, level: number): { current: number; max: number } {
  const base = 50 * level * level;
  const next = 50 * (level + 1) * (level + 1);
  return { current: xp - base, max: next - base };
}

export function TopBar() {
  const user = useUser((s) => s.user);
  const level = user?.level ?? 0;
  const xp = user?.xp ?? 0;
  const streak = user?.streakDays ?? 0;
  const { current, max } = xpToNextLevel(xp, level);

  return (
    <header className="border-b border-border px-4 md:px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-accent grid place-items-center text-black font-bold">
          F
        </div>
        <div className="font-semibold tracking-tight">FretForge</div>
      </div>
      <div className="hidden md:flex flex-1 max-w-md items-center gap-3">
        <Badge tone="accent">Lv {level}</Badge>
        <ProgressBar value={current} max={max} label={`${current} / ${max} XP`} />
      </div>
      <div className="flex items-center gap-3">
        <Badge tone={streak > 0 ? "good" : "default"}>
          {streak} day streak
        </Badge>
      </div>
    </header>
  );
}
