import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type DashboardData, type LessonSummary } from "../api/endpoints";
import { useUser } from "../store/userStore";
import { Card } from "../components/ui/Card";
import { Stat } from "../components/ui/Stat";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

export function Dashboard() {
  const user = useUser((s) => s.user);
  const [data, setData] = useState<DashboardData | null>(null);
  const [next, setNext] = useState<LessonSummary | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const dash = await api.getDashboard(user.id);
      if (cancelled) return;
      setData(dash);
      if (dash.nextRecommended) {
        try {
          const lesson = await api.getLesson(dash.nextRecommended.lessonId);
          if (!cancelled) setNext(lesson);
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || !data) return <div className="text-text-muted">Loading...</div>;

  const weak = data.weakAreas[0];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Welcome back, {user.username}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat
          label="Streak"
          value={`${data.user.streakDays} d`}
          hint="Practice every day to keep it alive"
        />
        <Stat
          label="XP"
          value={data.user.xp}
          hint={`Level ${data.user.level}`}
        />
        <Stat
          label="Weak area"
          value={weak ? weak.tag : "n/a"}
          hint={weak ? `${Math.round(weak.accuracy * 100)}% accuracy` : "Play more to detect"}
        />
      </div>

      {next && data.nextRecommended && (
        <Card>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge tone="accent">Recommended</Badge>
                {next.theoryTags.slice(0, 3).map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
              <div className="text-xl font-semibold">{next.title}</div>
              <div className="text-text-muted text-sm">{next.summary}</div>
              <div className="text-text-muted text-xs mt-1">
                {data.nextRecommended.reason}
              </div>
            </div>
            <Link to={`/lessons/${next.id}`}>
              <Button>Start</Button>
            </Link>
          </div>
        </Card>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3">Recent activity</h2>
        {data.recentLessons.length === 0 ? (
          <Card>
            <div className="text-text-muted">
              No activity yet. Pick a lesson to get started.
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.recentLessons.map((p) => (
              <Card key={p.lessonId}>
                <div className="flex items-center justify-between">
                  <div>
                    <Link
                      to={`/lessons/${p.lessonId}`}
                      className="font-medium hover:text-accent"
                    >
                      {p.lessonId}
                    </Link>
                    <div className="text-xs text-text-muted">
                      {p.status} &middot; best {Math.round(p.bestAccuracy * 100)}%
                    </div>
                  </div>
                  <Badge tone={p.status === "done" ? "good" : "default"}>
                    {p.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
