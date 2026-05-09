import type { LessonStep } from "../../api/endpoints";

interface Props {
  step: Extract<LessonStep, { kind: "prose" }>;
}

export function ProseStep({ step }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-2xl font-semibold">{step.title}</h3>
      <p className="text-text leading-relaxed whitespace-pre-line">{step.body}</p>
    </div>
  );
}
