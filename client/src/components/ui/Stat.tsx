import { Card } from "./Card";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
}

export function Stat({ label, value, hint }: Props) {
  return (
    <Card>
      <div className="text-text-muted text-xs uppercase tracking-wider">
        {label}
      </div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-text-muted text-sm mt-1">{hint}</div>}
    </Card>
  );
}
