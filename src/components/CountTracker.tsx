"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Exercise } from "@/data/exercises";
import { relativeDay } from "@/lib/date";
import { ClipThumb } from "./ClipPlayer";

/**
 * Running daily total for bodyweight movements — push-ups, squats, lunges.
 * You tap +5 / +10 through the day until you hit the target; beating your
 * previous best total is a personal record.
 */
export function CountTracker({
  exercise,
  target,
  note,
  accent,
  initial,
  best,
  bestDate,
  onChange,
  onRecord,
}: {
  exercise: Exercise;
  target: number;
  note?: string;
  accent: string;
  initial: number;
  best: number | null;
  bestDate: string | null;
  onChange: (total: number) => void;
  onRecord: () => void;
}) {
  const [total, setTotal] = useState(initial);
  const [beatenBest, setBeatenBest] = useState(false);
  const [hitTarget, setHitTarget] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Batch rapid taps into one write instead of a request per rep.
  useEffect(() => {
    if (total === initial) return;
    saveTimer.current = setTimeout(() => onChange(total), 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [total, initial, onChange]);

  const bump = (delta: number) => {
    const next = Math.max(0, total + delta);
    setTotal(next);
    navigator.vibrate?.(10);

    if (best !== null && total <= best && next > best) {
      setBeatenBest(true);
      onRecord();
      navigator.vibrate?.([20, 50, 30]);
    }
    if (total < target && next >= target) {
      setHitTarget(true);
      navigator.vibrate?.([20, 50, 30]);
    }
  };

  const percent = Math.min(100, (total / target) * 100);
  const bestPercent = best ? Math.min(100, (best / target) * 100) : null;

  return (
    <article
      className={`card overflow-hidden transition ${beatenBest ? "ring-2 ring-lime" : ""}`}
      style={total >= target ? { borderColor: `${accent}88` } : undefined}
    >
      <div className="flex items-center gap-3 p-3 pb-2">
        <Link href={`/exercise/${exercise.slug}`} className="pressable shrink-0">
          <ClipThumb clips={exercise.clips} className="h-12 w-12" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-white">{exercise.name}</p>
          <p className="truncate text-xs text-mist-400">{note ?? exercise.target}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular text-xl font-bold leading-none text-white">
            {total}
            <span className="text-sm text-mist-400">/{target}</span>
          </p>
          {best !== null && (
            <p className="tabular mt-1 text-[10px] text-mist-400">
              best {best}
              {bestDate ? ` · ${relativeDay(bestDate)}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar with a notch marking the record to beat. */}
      <div className="relative mx-3 h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${percent}%`, background: accent }}
        />
        {bestPercent !== null && bestPercent < 100 && (
          <div
            className="absolute inset-y-0 w-0.5 bg-white/70"
            style={{ left: `${bestPercent}%` }}
            title={`Previous best: ${best}`}
          />
        )}
      </div>

      {(beatenBest || hitTarget) && (
        <p
          className={`animate-pop mt-2 px-4 py-1.5 text-center text-xs font-bold ${
            beatenBest ? "bg-lime/15 text-lime" : "text-mist-300"
          }`}
        >
          {beatenBest ? "🎉 New record — you beat your best!" : `✓ ${target} done. Target hit.`}
        </p>
      )}

      <div className="flex gap-2 p-3">
        <button
          type="button"
          onClick={() => bump(-5)}
          aria-label="subtract 5"
          className="pressable h-11 w-12 shrink-0 rounded-xl bg-white/6 text-sm font-bold text-mist-300"
        >
          −5
        </button>
        {[1, 5, 10].map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => bump(step)}
            className="pressable h-11 flex-1 rounded-xl text-sm font-bold text-ink-900"
            style={{ background: step === 10 ? accent : "rgba(255,255,255,.88)" }}
          >
            +{step}
          </button>
        ))}
      </div>
    </article>
  );
}
