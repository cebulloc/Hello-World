import clsx from "clsx";
import type { ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  children?: ReactNode;
}

export function Tabs({ tabs, active, onChange, children }: Props) {
  return (
    <div>
      <div
        role="tablist"
        className="inline-flex p-1 bg-bg-elev border border-border rounded-xl gap-1"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === active}
            onClick={() => onChange(t.id)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-sm transition-colors",
              t.id === active
                ? "bg-bg-card text-text"
                : "text-text-muted hover:text-text",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}
