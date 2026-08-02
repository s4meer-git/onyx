"use client";

import { useMemo, useState } from "react";
import { formatShort } from "@/lib/date";

export type StepPoint = { date: string; steps: number | null };

const PAD = { top: 14, right: 8, bottom: 20, left: 34 };
const HEIGHT = 170;

/**
 * Daily step columns with a mean reference line. One series, so no legend —
 * the card title names it.
 */
export function StepsChart({
  points,
  goal = 10_000,
}: {
  points: StepPoint[];
  goal?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const { bars, max, average, ticks } = useMemo(() => {
    const values = points.map((point) => point.steps ?? 0);
    const logged = values.filter((value) => value > 0);
    const peak = Math.max(goal, ...values);
    // Round the scale up to a clean number so the axis reads well.
    const step = peak > 20_000 ? 10_000 : peak > 8_000 ? 5_000 : 2_000;
    const top = Math.ceil(peak / step) * step;

    return {
      bars: points.map((point, index) => ({ ...point, index, value: point.steps ?? 0 })),
      max: top,
      average: logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : 0,
      ticks: Array.from({ length: top / step + 1 }, (_, i) => i * step),
    };
  }, [points, goal]);

  const width = 320;
  const plotWidth = width - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const band = plotWidth / Math.max(1, bars.length);
  // Cap the bar and leave the band's remainder as air; ≥2px gap between bars.
  const barWidth = Math.max(3, Math.min(24, band - 2));
  const y = (value: number) => PAD.top + plotHeight * (1 - value / max);

  const active = hover === null ? null : bars[hover];

  return (
    <figure className="card p-4">
      <figcaption className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-mist-400">Steps</h2>
        <span className="tabular text-[11px] text-mist-400">
          {average > 0 ? `${Math.round(average).toLocaleString()} avg` : "no data yet"}
        </span>
      </figcaption>

      <p className="tabular mb-2 h-4 text-[11px]">
        {active ? (
          <>
            <span className="font-semibold text-white">
              {active.value ? active.value.toLocaleString() : "—"}
            </span>
            <span className="text-mist-400"> steps · {formatShort(active.date)}</span>
          </>
        ) : (
          <span className="text-mist-400">Last {bars.length} days</span>
        )}
      </p>

      <svg viewBox={`0 0 ${width} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="Daily steps">
        {/* Gridlines + y ticks */}
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--viz-grid)"
              strokeWidth="1"
            />
            <text x={PAD.left - 6} y={y(tick) + 3} textAnchor="end" className="fill-mist-400 text-[8px]">
              {tick >= 1000 ? `${tick / 1000}k` : tick}
            </text>
          </g>
        ))}

        {/* Goal reference */}
        {goal <= max && (
          <line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={y(goal)}
            y2={y(goal)}
            stroke="var(--viz-blue)"
            strokeWidth="1.5"
            opacity="0.65"
          />
        )}

        {bars.map((bar) => {
          const height = Math.max(0, plotHeight * (bar.value / max));
          if (height <= 0) return null;
          const x = PAD.left + bar.index * band + (band - barWidth) / 2;
          const top = y(bar.value);
          const baseline = PAD.top + plotHeight;
          // Rounded cap, square where it meets the baseline.
          const r = Math.min(4, barWidth / 2, height);
          return (
            <path
              key={bar.date}
              d={`M${x},${baseline} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + barWidth - r},${top} Q${x + barWidth},${top} ${x + barWidth},${top + r} L${x + barWidth},${baseline} Z`}
              fill="var(--viz-orange)"
              opacity={hover === null || hover === bar.index ? 1 : 0.45}
            />
          );
        })}

        {/* Invisible hit targets — wider than the bars so they're tappable. */}
        {bars.map((bar) => (
          <rect
            key={`hit-${bar.date}`}
            x={PAD.left + bar.index * band}
            y={PAD.top}
            width={band}
            height={plotHeight}
            fill="transparent"
            onMouseEnter={() => setHover(bar.index)}
            onMouseLeave={() => setHover(null)}
            onTouchStart={() => setHover(bar.index)}
          />
        ))}

        {/* Date axis: first, middle and last only, so labels never collide. */}
        {[0, Math.floor(bars.length / 2), bars.length - 1].map((index) =>
          bars[index] ? (
            <text
              key={`x-${index}`}
              x={PAD.left + index * band + band / 2}
              y={HEIGHT - 6}
              textAnchor="middle"
              className="fill-mist-400 text-[8px]"
            >
              {formatShort(bars[index].date)}
            </text>
          ) : null,
        )}
      </svg>

      <p className="mt-1 flex items-center gap-1.5 text-[10px] text-mist-400">
        <span className="inline-block h-0.5 w-4 rounded" style={{ background: "var(--viz-blue)" }} />
        {goal.toLocaleString()} step goal
      </p>
    </figure>
  );
}
