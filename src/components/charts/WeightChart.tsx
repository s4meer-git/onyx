"use client";

import { useMemo, useState } from "react";
import { formatShort } from "@/lib/date";

export type WeightPoint = { date: string; weightKg: number };

const PAD = { top: 16, right: 34, bottom: 20, left: 32 };
const HEIGHT = 180;
const WIDTH = 320;

/**
 * Bodyweight over time — one line, with the healthy-BMI band and the goal
 * drawn as reference marks rather than extra series.
 */
export function WeightChart({
  points,
  healthyRange,
  goalKg,
}: {
  points: WeightPoint[];
  healthyRange?: [number, number] | null;
  goalKg?: number | null;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;

  const { scale, path, area, coords, ticks } = useMemo(() => {
    const values = points.map((point) => point.weightKg);
    const candidates = [...values, ...(goalKg ? [goalKg] : [])];
    const rawMin = Math.min(...candidates);
    const rawMax = Math.max(...candidates);
    // Always show at least a 4 kg window so a stable weight isn't drawn as noise.
    const span = Math.max(4, rawMax - rawMin);
    const mid = (rawMax + rawMin) / 2;
    const min = Math.floor((mid - span * 0.75) / 2) * 2;
    const max = Math.ceil((mid + span * 0.75) / 2) * 2;

    const x = (index: number) =>
      PAD.left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
    const y = (value: number) => PAD.top + plotHeight * (1 - (value - min) / (max - min));

    const pointCoords = points.map((point, index) => ({
      ...point,
      x: x(index),
      y: y(point.weightKg),
      index,
    }));

    const line = pointCoords.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const fill = pointCoords.length
      ? `${line} L${pointCoords.at(-1)!.x},${PAD.top + plotHeight} L${pointCoords[0].x},${PAD.top + plotHeight} Z`
      : "";

    const stepSize = max - min > 20 ? 10 : max - min > 10 ? 5 : 2;
    const tickList: number[] = [];
    for (let value = Math.ceil(min / stepSize) * stepSize; value <= max; value += stepSize) {
      tickList.push(value);
    }

    return { scale: { min, max, y }, path: line, area: fill, coords: pointCoords, ticks: tickList };
  }, [points, goalKg, plotHeight, plotWidth]);

  if (points.length === 0) {
    return (
      <figure className="card p-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-mist-400">Bodyweight</h2>
        <p className="mt-3 text-sm text-mist-400">
          Log your weight on the workout screen and the trend will appear here.
        </p>
      </figure>
    );
  }

  const active = hover === null ? coords.at(-1)! : coords[hover];
  const first = points[0].weightKg;
  const latest = points.at(-1)!.weightKg;
  const change = latest - first;

  return (
    <figure className="card p-4">
      <figcaption className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-mist-400">Bodyweight</h2>
        <span className="tabular text-[11px] text-mist-400">
          {change === 0 ? "no change" : `${change > 0 ? "+" : ""}${change.toFixed(1)} kg`} over{" "}
          {points.length} weigh-ins
        </span>
      </figcaption>

      <p className="tabular mb-2 h-4 text-[11px]">
        <span className="font-semibold text-white">{active.weightKg.toFixed(1)} kg</span>
        <span className="text-mist-400"> · {formatShort(active.date)}</span>
      </p>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="Bodyweight trend">
        {/* Healthy BMI band drawn behind everything. */}
        {healthyRange && (
          <rect
            x={PAD.left}
            y={scale.y(Math.min(healthyRange[1], scale.max))}
            width={plotWidth}
            height={Math.max(
              0,
              scale.y(Math.max(healthyRange[0], scale.min)) - scale.y(Math.min(healthyRange[1], scale.max)),
            )}
            fill="var(--viz-aqua)"
            opacity="0.1"
          />
        )}

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={scale.y(tick)}
              y2={scale.y(tick)}
              stroke="var(--viz-grid)"
              strokeWidth="1"
            />
            <text x={PAD.left - 6} y={scale.y(tick) + 3} textAnchor="end" className="fill-mist-400 text-[8px]">
              {tick}
            </text>
          </g>
        ))}

        {goalKg && goalKg >= scale.min && goalKg <= scale.max && (
          <>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={scale.y(goalKg)}
              y2={scale.y(goalKg)}
              stroke="var(--viz-aqua)"
              strokeWidth="1.5"
            />
            <text
              x={WIDTH - PAD.right + 3}
              y={scale.y(goalKg) + 3}
              className="fill-mist-400 text-[8px]"
            >
              goal
            </text>
          </>
        )}

        <path d={area} fill="var(--viz-blue)" opacity="0.1" />
        <path
          d={path}
          fill="none"
          stroke="var(--viz-blue)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Crosshair on the hovered reading. */}
        <line
          x1={active.x}
          x2={active.x}
          y1={PAD.top}
          y2={PAD.top + plotHeight}
          stroke="rgba(255,255,255,.25)"
          strokeWidth="1"
        />
        {/* End marker: ≥8px with a 2px surface ring so it stays legible. */}
        <circle cx={active.x} cy={active.y} r="5" fill="var(--viz-blue)" stroke="var(--viz-surface)" strokeWidth="2" />

        {coords.map((point) => (
          <rect
            key={point.date}
            x={point.x - plotWidth / Math.max(1, coords.length) / 2}
            y={PAD.top}
            width={Math.max(8, plotWidth / Math.max(1, coords.length))}
            height={plotHeight}
            fill="transparent"
            onMouseEnter={() => setHover(point.index)}
            onMouseLeave={() => setHover(null)}
            onTouchStart={() => setHover(point.index)}
          />
        ))}

        <text x={PAD.left} y={HEIGHT - 6} className="fill-mist-400 text-[8px]">
          {formatShort(points[0].date)}
        </text>
        <text x={WIDTH - PAD.right} y={HEIGHT - 6} textAnchor="end" className="fill-mist-400 text-[8px]">
          {formatShort(points.at(-1)!.date)}
        </text>
      </svg>

      {healthyRange && (
        <p className="mt-1 flex items-center gap-1.5 text-[10px] text-mist-400">
          <span
            className="inline-block h-2.5 w-4 rounded-sm"
            style={{ background: "var(--viz-aqua)", opacity: 0.25 }}
          />
          healthy BMI range {healthyRange[0].toFixed(0)}–{healthyRange[1].toFixed(0)} kg
        </p>
      )}
    </figure>
  );
}
