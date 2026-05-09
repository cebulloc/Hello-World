import clsx from "clsx";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  tone?: "default" | "good" | "bad" | "accent";
}

const tones: Record<NonNullable<Props["tone"]>, string> = {
  default: "bg-bg-elev text-text-muted border-border",
  good: "bg-good/10 text-good border-good/30",
  bad: "bg-bad/10 text-bad border-bad/30",
  accent: "bg-accent/10 text-accent border-accent/30",
};

export function Badge({ children, tone = "default" }: Props) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs border",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
