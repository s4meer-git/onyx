"use client";

import { useState } from "react";

/**
 * Section heading that can fold its contents away. Warm-up blocks start
 * collapsed so the working sets are the first thing on screen.
 */
export function CollapsibleBlock({
  title,
  kind,
  count,
  note,
  children,
}: {
  title: string;
  kind: string;
  count?: number;
  note?: string;
  children: React.ReactNode;
}) {
  const isWarmup = kind === "warmup";
  const [open, setOpen] = useState(!isWarmup);

  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-1"
      >
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-mist-400">{title}</h2>
        <div className="h-px flex-1 bg-white/8" />
        {isWarmup && count ? (
          <span className="tabular rounded-full bg-white/6 px-2 py-0.5 text-[10px] font-medium text-mist-400">
            {count} drills
          </span>
        ) : null}
        <span className={`text-mist-400 transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>

      {open && (
        <>
          {note && <p className="px-1 text-xs text-mist-400">{note}</p>}
          {children}
        </>
      )}
    </section>
  );
}
