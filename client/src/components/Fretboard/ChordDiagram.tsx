interface Props {
  name?: string;
  /** strings 6..1; -1 = mute, 0 = open, n = fretted */
  frets: number[];
  fingers?: number[];
  size?: "sm" | "md";
}

export function ChordDiagram({
  name,
  frets,
  fingers,
  size = "md",
}: Props) {
  const minFret = Math.max(0, ...frets) > 4
    ? Math.max(1, Math.min(...frets.filter((f) => f > 0)) - 1)
    : 0;
  const totalFrets = 5;
  const cell = size === "md" ? 22 : 16;
  const padX = cell;
  const padY = cell;
  const width = padX * 2 + cell * 5;
  const height = padY * 2 + cell * totalFrets;

  const stringX = (i: number) => padX + i * cell;
  const fretY = (f: number) => padY + (f - minFret) * cell;

  return (
    <div className="inline-flex flex-col items-center">
      {name && (
        <div className="text-text-muted text-xs uppercase tracking-wider mb-1">
          {name}
        </div>
      )}
      <svg width={width} height={height + 18}>
        {/* strings */}
        {Array.from({ length: 6 }, (_, i) => (
          <line
            key={`s-${i}`}
            x1={stringX(i)}
            x2={stringX(i)}
            y1={padY}
            y2={padY + cell * totalFrets}
            stroke="#7a808a"
          />
        ))}
        {/* frets */}
        {Array.from({ length: totalFrets + 1 }, (_, f) => (
          <line
            key={`f-${f}`}
            x1={padX}
            x2={padX + cell * 5}
            y1={padY + cell * f}
            y2={padY + cell * f}
            stroke={f === 0 && minFret === 0 ? "#f5e8c8" : "#7a808a"}
            strokeWidth={f === 0 && minFret === 0 ? 3 : 1}
          />
        ))}
        {minFret > 0 && (
          <text
            x={padX - 8}
            y={padY + cell * 0.7}
            textAnchor="end"
            fontSize={10}
            fill="#7a808a"
          >
            {minFret + 1}fr
          </text>
        )}
        {/* dots / X / O */}
        {frets.map((f, idx) => {
          const x = stringX(5 - idx); // strings are drawn high->low left->right
          if (f === -1) {
            return (
              <text
                key={`x-${idx}`}
                x={x}
                y={padY - 4}
                textAnchor="middle"
                fontSize={10}
                fill="#f15c5c"
              >
                X
              </text>
            );
          }
          if (f === 0) {
            return (
              <circle
                key={`o-${idx}`}
                cx={x}
                cy={padY - 6}
                r={4}
                fill="none"
                stroke="#aaa"
              />
            );
          }
          const cy = fretY(f) - cell / 2;
          return (
            <g key={`d-${idx}`}>
              <circle cx={x} cy={cy} r={cell / 2 - 4} fill="#3ecf8e" />
              <text
                x={x}
                y={cy + 3}
                textAnchor="middle"
                fontSize={10}
                fontWeight={700}
                fill="#0b0d10"
              >
                {fingers?.[idx] ? fingers[idx] : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
