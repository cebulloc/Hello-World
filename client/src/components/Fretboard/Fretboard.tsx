import { useMemo } from "react";
import clsx from "clsx";
import { TUNINGS, type TuningId } from "../../theory/tunings";
import { fretNote } from "../../theory/fretboard";
import { overlayMarkers, type FretboardOverlay } from "./overlays";

interface Props {
  tuning: TuningId;
  frets?: number;
  leftHanded?: boolean;
  showNoteNames?: boolean;
  overlay?: FretboardOverlay;
  onFretClick?: (info: { stringIndex: number; fret: number; pitch: string }) => void;
  className?: string;
}

const STRING_COUNT = 6;
const PADDING_X = 24;
const PADDING_Y = 16;
const STRING_GAP = 26;
const FRET_INLAYS = new Set([3, 5, 7, 9, 15, 17, 19, 21]);
const DOUBLE_INLAYS = new Set([12, 24]);

export function Fretboard({
  tuning,
  frets = 12,
  leftHanded = false,
  showNoteNames = true,
  overlay = { kind: "none" },
  onFretClick,
  className,
}: Props) {
  const tuningDef = TUNINGS[tuning] ?? TUNINGS.standard!;
  const fretWidth = 56;
  const width = PADDING_X * 2 + fretWidth * frets;
  const height = PADDING_Y * 2 + STRING_GAP * (STRING_COUNT - 1);

  const markers = useMemo(() => overlayMarkers(overlay), [overlay]);

  const stringY = (i: number) =>
    PADDING_Y + (STRING_COUNT - 1 - i) * STRING_GAP; // string 0 at bottom

  const fretX = (fret: number) => {
    if (fret === 0) return PADDING_X;
    return PADDING_X + (fret - 0.5) * fretWidth;
  };

  return (
    <div
      className={clsx(
        "card overflow-x-auto",
        leftHanded && "transform -scale-x-100",
        className,
      )}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ minWidth: width }}
        aria-label="Guitar fretboard"
      >
        {/* nut */}
        <rect
          x={PADDING_X - 4}
          y={PADDING_Y - 4}
          width={4}
          height={STRING_GAP * (STRING_COUNT - 1) + 8}
          fill="#f5e8c8"
          rx={1}
        />
        {/* fret wires */}
        {Array.from({ length: frets }, (_, i) => i + 1).map((f) => (
          <line
            key={`wire-${f}`}
            x1={PADDING_X + f * fretWidth}
            x2={PADDING_X + f * fretWidth}
            y1={PADDING_Y - 2}
            y2={PADDING_Y + STRING_GAP * (STRING_COUNT - 1) + 2}
            stroke="#3a4049"
            strokeWidth={2}
          />
        ))}
        {/* fret inlays */}
        {Array.from({ length: frets }, (_, i) => i + 1).map((f) => {
          if (DOUBLE_INLAYS.has(f)) {
            const y1 = PADDING_Y + STRING_GAP * 1.5;
            const y2 = PADDING_Y + STRING_GAP * 3.5;
            return (
              <g key={`inlay-${f}`}>
                <circle cx={fretX(f)} cy={y1} r={4} fill="#2a2f37" />
                <circle cx={fretX(f)} cy={y2} r={4} fill="#2a2f37" />
              </g>
            );
          }
          if (FRET_INLAYS.has(f)) {
            return (
              <circle
                key={`inlay-${f}`}
                cx={fretX(f)}
                cy={PADDING_Y + STRING_GAP * 2.5}
                r={4}
                fill="#2a2f37"
              />
            );
          }
          return null;
        })}
        {/* strings */}
        {Array.from({ length: STRING_COUNT }, (_, i) => {
          const y = stringY(i);
          return (
            <line
              key={`s-${i}`}
              x1={PADDING_X}
              x2={width - PADDING_X / 2}
              y1={y}
              y2={y}
              stroke={i < 3 ? "#aaa9a3" : "#d8d3c7"}
              strokeWidth={1 + (5 - i) * 0.2}
            />
          );
        })}
        {/* fret numbers */}
        {Array.from({ length: frets + 1 }, (_, f) => (
          <text
            key={`fnum-${f}`}
            x={f === 0 ? PADDING_X : PADDING_X + (f - 0.5) * fretWidth}
            y={height - 2}
            textAnchor="middle"
            fontSize={10}
            fill="#7a808a"
            transform={leftHanded ? `scale(-1,1) translate(-${width},0)` : ""}
          >
            {f}
          </text>
        ))}
        {/* click targets */}
        {onFretClick &&
          Array.from({ length: STRING_COUNT }, (_, s) =>
            Array.from({ length: frets + 1 }, (_, f) => {
              const x = f === 0 ? PADDING_X - 16 : PADDING_X + (f - 1) * fretWidth;
              const w = f === 0 ? 16 : fretWidth;
              return (
                <rect
                  key={`hit-${s}-${f}`}
                  x={x}
                  y={stringY(s) - STRING_GAP / 2}
                  width={w}
                  height={STRING_GAP}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => {
                    const note = fretNote(tuning, s, f);
                    onFretClick({
                      stringIndex: s,
                      fret: f,
                      pitch: note.pitch,
                    });
                  }}
                />
              );
            }),
          )}
        {/* dots */}
        {markers.map((m, i) => {
          const cx = fretX(m.fret);
          const cy = stringY(m.stringIndex);
          const isRoot = m.emphasis === "root";
          const isHighlight = m.emphasis === "highlight";
          const fill = isRoot
            ? "#f59f0a"
            : isHighlight
              ? "#3ecf8e"
              : "#1f4d8a";
          const text = showNoteNames || isRoot || isHighlight ? m.label : "";
          return (
            <g key={`m-${i}`}>
              <circle
                cx={cx}
                cy={cy}
                r={11}
                fill={fill}
                stroke="#0b0d10"
                strokeWidth={1.5}
              />
              {text && (
                <text
                  x={cx}
                  y={cy + 3}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={600}
                  fill={isRoot ? "#0b0d10" : "#e6e8eb"}
                  transform={leftHanded ? `scale(-1,1) translate(-${cx * 2},0)` : ""}
                >
                  {text}
                </text>
              )}
            </g>
          );
        })}
        {/* open string labels */}
        {tuningDef.strings.map((s, idx) => (
          <text
            key={`open-${idx}`}
            x={PADDING_X - 12}
            y={stringY(idx) + 3}
            textAnchor="end"
            fontSize={10}
            fill="#7a808a"
            transform={leftHanded ? `scale(-1,1) translate(-${(PADDING_X - 12) * 2},0)` : ""}
          >
            {s.replace(/\d+$/, "")}
          </text>
        ))}
      </svg>
    </div>
  );
}
