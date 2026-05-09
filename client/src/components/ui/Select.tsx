import clsx from "clsx";
import type { SelectHTMLAttributes } from "react";

type Option = { value: string; label: string };

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  options: Option[];
  label?: string;
}

export function Select({ options, label, className, ...rest }: Props) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="text-text-muted">{label}</span>}
      <select className={clsx("input", className)} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
