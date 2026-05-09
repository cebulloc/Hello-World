import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type Lesson } from "../api/endpoints";
import { useUser } from "../store/userStore";
import { LessonStep } from "../components/lessons/LessonStep";
import { Button } from "../components/ui/Button";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Card } from "../components/ui/Card";

export function LessonView() {
  const { id } = useParams();
  const user = useUser((s) => s.user);
  const apply = useUser((s) => s.applyUserDelta);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api.getLesson(id).then((l) => !cancelled && setLesson(l));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!lesson) return <div className="text-text-muted">Loading...</div>;

  const step = lesson.steps[stepIdx]!;
  const isLast = stepIdx === lesson.steps.length - 1;

  const next = async () => {
    if (!isLast) {
      setStepIdx((i) => i + 1);
      return;
    }
    if (!user) return;
    const accuracy =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 1;
    setSubmitting(true);
    try {
      const result = await api.postLessonProgress(user.id, {
        lessonId: lesson.id,
        accuracy,
        completed: true,
      });
      apply({
        xp: result.user.xp,
        level: result.user.level,
        streakDays: result.user.streakDays,
      });
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  const back = () => setStepIdx((i) => Math.max(0, i - 1));

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <Link to="/lessons" className="text-text-muted hover:text-text text-sm">
          &larr; Lessons
        </Link>
        <div className="text-text-muted text-sm">
          step {stepIdx + 1} / {lesson.steps.length}
        </div>
      </div>
      <h1 className="text-3xl font-semibold">{lesson.title}</h1>
      <ProgressBar value={stepIdx + 1} max={lesson.steps.length} />

      {done ? (
        <Card>
          <div className="space-y-3 text-center py-6">
            <div className="text-4xl">+{lesson.xpReward} XP</div>
            <div className="text-text-muted">Lesson complete.</div>
            <div className="flex justify-center gap-2 pt-2">
              <Link to="/lessons">
                <Button variant="ghost">Back to lessons</Button>
              </Link>
              <Link to="/">
                <Button>Dashboard</Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <Card padding="lg">
          <LessonStep
            step={step}
            onScore={(s) => setScores((prev) => [...prev, s])}
          />
          <div className="flex justify-between pt-6 mt-6 border-t border-border">
            <Button variant="ghost" onClick={back} disabled={stepIdx === 0}>
              Back
            </Button>
            <Button onClick={next} disabled={submitting}>
              {isLast ? (submitting ? "Saving..." : "Finish") : "Next"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
