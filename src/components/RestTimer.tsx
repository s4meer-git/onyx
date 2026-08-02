"use client";

import { useEffect, useState } from "react";

/** Floating countdown that appears after a set is logged. */
export function RestTimer({ seconds, onDismiss }: { seconds: number; onDismiss: () => void }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      navigator.vibrate?.([30, 60, 30]);
      const timeout = setTimeout(onDismiss, 1800);
      return () => clearTimeout(timeout);
    }
    const interval = setInterval(() => setRemaining((value) => value - 1), 1000);
    return () => clearInterval(interval);
  }, [remaining, onDismiss]);

  const percent = Math.max(0, (remaining / seconds) * 100);
  const done = remaining <= 0;

  return (
    <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-16 z-50 flex justify-center px-4">
      <div className="card animate-pop pointer-events-auto relative w-full max-w-sm overflow-hidden px-4 py-3">
        <div
          className="absolute inset-y-0 left-0 bg-flame/15 transition-[width] duration-1000 ease-linear"
          style={{ width: `${percent}%` }}
        />
        <div className="relative flex items-center gap-3">
          <span className="text-lg">{done ? "💪" : "⏱"}</span>
          <div className="flex-1">
            <p className="text-xs text-mist-400">{done ? "Rest over" : "Rest"}</p>
            <p className="tabular text-lg font-bold leading-tight text-white">
              {done ? "Go!" : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRemaining((value) => value + 30)}
            className="pressable rounded-lg bg-white/8 px-2.5 py-1.5 text-[11px] font-semibold text-mist-200"
          >
            +30s
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss rest timer"
            className="pressable rounded-lg bg-white/8 px-2.5 py-1.5 text-[11px] font-semibold text-mist-200"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
