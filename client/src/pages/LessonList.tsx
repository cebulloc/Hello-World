import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type LessonSummary, type LessonProgress } from "../api/endpoints";
import { useUser } from "../store/userStore";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

const TRACK_LABELS: Record<string, string> = {
  chords: "Chords",
  rhythm: "Rhythm",
  scales: "Scales",
  theory: "Theory",
  ear: "Ear training",
  improv: "Improvisation",
};

export function LessonList() {
  const user = useUser((s) => s.user);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await api.listLessons();
      if (!cancelled) setLessons(all);
      if (user) {
        const dash = await api.getDashboard(user.id);
        if (cancelled) return;
        const map: Record<string, LessonProgress> = {};
        for (const p of dash.recentLessons) map[p.lessonId] = p;
        setProgress(map);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const byTrack = useMemo(() => {
    const out: Record<string, LessonSummary[]> = {};
    for (const l of lessons) {
      (out[l.track] ||= []).push(l);
    }
    return out;
  }, [lessons]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Lessons</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Object.entries(byTrack).map(([track, items]) => (
          <Card key={track}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-text-muted uppercase text-xs tracking-wider">
                {TRACK_LABELS[track] ?? track}
              </div>
              <Badge>{items.length} lessons</Badge>
            </div>
            <ul className="space-y-1">
              {items
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((l) => {
                  const p = progress[l.id];
                  return (
                    <li key={l.id}>
                      <Link
                        to={`/lessons/${l.id}`}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-bg-elev"
                      >
                        <span>
                          <span
                            className={`inline-block w-2 h-2 rounded-full mr-2 ${
                              p?.status === "done"
                                ? "bg-good"
                                : p?.status === "in_progress"
                                  ? "bg-accent"
                                  : "bg-border"
                            }`}
                          />
                          {l.title}
                        </span>
                        <span className="text-xs text-text-muted">
                          d{l.difficulty}
                        </span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
