"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatLong } from "@/lib/date";

export type DayCell = { date: string; sets: number; volume: number };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

/** Five sequential steps plus an "empty" tone — see globals.css for the ramp. */
const HEAT = [
  "var(--viz-heat-0)",
  "var(--viz-heat-1)",
  "var(--viz-heat-2)",
  "var(--viz-heat-3)",
  "var(--viz-heat-4)",
  "var(--viz-heat-5)",
];

const CELL = 13;
const GAP = 3;
const PITCH = CELL + GAP;

/**
 * GitHub / LeetCode style year heat map: one column per week, Monday at the
 * top, month names along the top edge and the day-of-month in the tooltip.
 */
export function ContributionGraph({ days, title }: { days: DayCell[]; title?: string }) {
  const [hover, setHover] = useState<DayCell | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Open on the most recent weeks rather than six months ago.
  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollLeft = node.scrollWidth;
  }, [days.length]);

  const { weeks, monthTicks, max } = useMemo(() => {
    const columns: DayCell[][] = [];
    let column: DayCell[] = [];

    for (const day of days) {
      column.push(day);
      if (column.length === 7) {
        columns.push(column);
        column = [];
      }
    }
    if (column.length) columns.push(column);

    // A month tick sits on the first column whose week contains the 1st.
    const ticks: { label: string; index: number }[] = [];
    columns.forEach((week, index) => {
      const firstOfMonth = week.find((day) => day.date.endsWith("-01"));
      if (firstOfMonth) {
        const month = Number(firstOfMonth.date.slice(5, 7)) - 1;
        if (ticks.at(-1)?.label !== MONTHS[month]) {
          ticks.push({ label: MONTHS[month], index });
        }
      }
    });

    return {
      weeks: columns,
      monthTicks: ticks,
      max: Math.max(1, ...days.map((day) => day.sets)),
    };
  }, [days]);

  const level = (sets: number) => {
    if (sets <= 0) return 0;
    // Quintiles of the busiest day, so the ramp adapts to how you actually train.
    return Math.min(5, Math.max(1, Math.ceil((sets / max) * 5)));
  };

  const width = weeks.length * PITCH;
  const activeDays = days.filter((day) => day.sets > 0).length;

  return (
    <figure className="card p-4">
      <figcaption className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-mist-400">
          {title ?? "Training history"}
        </h2>
        <span className="tabular text-[11px] text-mist-400">{activeDays} active days</span>
      </figcaption>

      {/* The weekday rail sits OUTSIDE the scroller so it stays put while the
          weeks scroll horizontally. */}
      <div className="flex gap-1.5">
        <div className="shrink-0 pt-[18px]" style={{ width: 26 }}>
          {WEEKDAYS.map((label, index) => (
            <div
              key={index}
              className="text-[9px] leading-none text-mist-400"
              style={{ height: CELL, marginBottom: GAP, paddingTop: 3 }}
            >
              {label}
            </div>
          ))}
        </div>

        <div ref={scroller} className="no-scrollbar min-w-0 flex-1 overflow-x-auto pb-1">
          {/* Month rail */}
          <div className="relative h-[18px]" style={{ width }}>
            {monthTicks.map((tick) => (
              <span
                key={`${tick.label}-${tick.index}`}
                className="absolute top-0 text-[10px] font-medium text-mist-400"
                style={{ left: tick.index * PITCH }}
              >
                {tick.label}
              </span>
            ))}
          </div>

          {/* Cells */}
          <div className="flex" style={{ gap: GAP, width }}>
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col" style={{ gap: GAP }}>
                {week.map((day) => (
                  <button
                    key={day.date}
                    type="button"
                    onMouseEnter={() => setHover(day)}
                    onFocus={() => setHover(day)}
                    onMouseLeave={() => setHover(null)}
                    onBlur={() => setHover(null)}
                    aria-label={`${day.date}: ${day.sets} sets`}
                    className="rounded-[3px] transition-transform hover:scale-125"
                    style={{
                      width: CELL,
                      height: CELL,
                      background: HEAT[level(day.sets)],
                      outline: hover?.date === day.date ? "1.5px solid rgba(255,255,255,.85)" : "none",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip line — fixed height so the card doesn't jump on hover. */}
      <p className="mt-3 h-4 text-[11px] text-mist-300">
        {hover ? (
          <>
            <span className="font-semibold text-white">
              {hover.sets === 0 ? "Rest day" : `${hover.sets} sets`}
            </span>
            {hover.volume > 0 && <span className="text-mist-400"> · {hover.volume.toLocaleString()} kg</span>}
            <span className="text-mist-400"> · {formatLong(hover.date)}</span>
          </>
        ) : (
          <span className="text-mist-400">Tap a square for that day&rsquo;s detail</span>
        )}
      </p>

      <div className="mt-2 flex items-center justify-end gap-1.5">
        <span className="text-[10px] text-mist-400">Less</span>
        {HEAT.map((tone) => (
          <span key={tone} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: tone }} />
        ))}
        <span className="text-[10px] text-mist-400">More</span>
      </div>
    </figure>
  );
}
