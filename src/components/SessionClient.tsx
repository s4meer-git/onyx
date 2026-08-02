"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { Exercise } from "@/data/exercises";
import type { Day } from "@/data/schedule";
import type { PersonalRecord, SetLog } from "@/lib/queries";
import { ClipThumb } from "./ClipPlayer";
import { CountTracker } from "./CountTracker";
import { CollapsibleBlock } from "./CollapsibleBlock";
import { RestTimer } from "./RestTimer";

export type SessionItem = {
  slug: string;
  sets: number;
  reps: string;
  rest?: string;
  note?: string;
  count?: number;
  block: string;
  kind: string;
};

type Props = {
  day: Day;
  date: string;
  items: SessionItem[];
  exercises: Record<string, Exercise>;
  initialLogs: SetLog[];
  lastSessions: Record<string, { date: string; sets: SetLog[] } | null>;
  records: Record<string, PersonalRecord>;
  completedAt: string | null;
  readOnly?: boolean;
};

const key = (slug: string, index: number) => `${slug}#${index}`;
const estimate1RM = (weight: number, reps: number) => weight * (1 + reps / 30);

export function SessionClient({
  day,
  date,
  items,
  exercises,
  initialLogs,
  lastSessions,
  records,
  completedAt,
  readOnly = false,
}: Props) {
  const [logs, setLogs] = useState<Record<string, SetLog>>(() =>
    Object.fromEntries(initialLogs.map((log) => [key(log.exerciseSlug, log.setIndex), log])),
  );
  const [rest, setRest] = useState<{ seconds: number; token: number } | null>(null);
  const [finished, setFinished] = useState(completedAt);
  const [celebrating, setCelebrating] = useState<string | null>(null);

  const plannedSets = useMemo(
    () =>
      items
        .filter((item) => item.kind !== "warmup" || item.count)
        .reduce((sum, item) => sum + (item.count ? 1 : item.sets), 0),
    [items],
  );
  const loggedSets = Object.keys(logs).length;
  const percent = plannedSets === 0 ? 0 : Math.min(100, Math.round((loggedSets / plannedSets) * 100));

  /** First working exercise that still has sets left, shown in the sticky bar. */
  const nextUp = useMemo(() => {
    const pending = items.find((item) => {
      if (item.count) return (logs[key(item.slug, 0)]?.reps ?? 0) < item.count;
      if (item.kind === "warmup") return false;
      return Array.from({ length: item.sets }, (_, i) => logs[key(item.slug, i)]).some((log) => !log);
    });
    return pending ? (exercises[pending.slug]?.name ?? null) : null;
  }, [items, logs, exercises]);

  const saveSet = useCallback(
    async (slug: string, setIndex: number, payload: Partial<SetLog>, restSeconds?: number) => {
      const optimistic: SetLog = {
        id: key(slug, setIndex),
        workoutDate: date,
        dayKey: day.key,
        exerciseSlug: slug,
        setIndex,
        reps: payload.reps ?? null,
        weightKg: payload.weightKg ?? null,
        durationSec: payload.durationSec ?? null,
        note: null,
      };
      setLogs((current) => ({ ...current, [key(slug, setIndex)]: optimistic }));
      navigator.vibrate?.(12);

      // A record is a better estimated 1RM when weight is involved, or simply
      // more reps for bodyweight work.
      const record = records[slug];
      const beatsRecord =
        optimistic.weightKg && optimistic.reps
          ? !record?.estimated1RM || estimate1RM(optimistic.weightKg, optimistic.reps) > record.estimated1RM
          : Boolean(optimistic.reps) && (!record?.bestReps || optimistic.reps! > record.bestReps);

      if (beatsRecord) {
        setCelebrating(slug);
        setTimeout(() => setCelebrating(null), 2600);
      }

      if (restSeconds) setRest({ seconds: restSeconds, token: Date.now() });

      const response = await fetch("/api/sets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workoutDate: date,
          dayKey: day.key,
          exerciseSlug: slug,
          setIndex,
          reps: optimistic.reps,
          weightKg: optimistic.weightKg,
          durationSec: optimistic.durationSec,
        }),
      });

      if (!response.ok) {
        setLogs((current) => {
          const next = { ...current };
          delete next[key(slug, setIndex)];
          return next;
        });
      }
    },
    [date, day.key, records],
  );

  const clearSet = useCallback(
    async (slug: string, setIndex: number) => {
      setLogs((current) => {
        const next = { ...current };
        delete next[key(slug, setIndex)];
        return next;
      });
      await fetch(
        `/api/sets?date=${date}&exerciseSlug=${encodeURIComponent(slug)}&setIndex=${setIndex}`,
        { method: "DELETE" },
      );
    },
    [date],
  );

  const finish = useCallback(async () => {
    const next = finished ? null : new Date().toISOString();
    setFinished(next);
    navigator.vibrate?.([15, 40, 25]);
    await fetch("/api/day", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date, dayKey: day.key, complete: Boolean(next) }),
    });
  }, [date, day.key, finished]);

  const blocks = useMemo(() => {
    const grouped: { title: string; kind: string; items: SessionItem[] }[] = [];
    for (const item of items) {
      const last = grouped.at(-1);
      if (last && last.title === item.block) last.items.push(item);
      else grouped.push({ title: item.block, kind: item.kind, items: [item] });
    }
    return grouped;
  }, [items]);

  return (
    <div className="space-y-5">
      {!readOnly && (
        <div className="card sticky top-2 z-30 flex items-center gap-3 p-3 backdrop-blur-xl">
          <ProgressRing percent={percent} accent={day.accent} />
          <div className="min-w-0 flex-1">
            <p className="tabular text-sm font-semibold text-white">
              {loggedSets} <span className="text-mist-400">/ {plannedSets} sets</span>
            </p>
            <p className="truncate text-xs text-mist-400">
              {nextUp ? `Next: ${nextUp}` : finished ? "Session complete" : "All sets logged"}
            </p>
          </div>
          <button
            type="button"
            onClick={finish}
            className={`pressable shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
              finished ? "bg-lime text-ink-900" : "bg-white/10 text-white"
            }`}
          >
            {finished ? "Done ✓" : "Finish"}
          </button>
        </div>
      )}

      {blocks.map((block) => (
        <CollapsibleBlock key={block.title} title={block.title} kind={block.kind} count={block.items.length}>
          {block.items.map((item) => {
            const exercise = exercises[item.slug];
            if (!exercise) return null;

            if (item.count) {
              const record = records[item.slug];
              return (
                <CountTracker
                  key={`${block.title}-${item.slug}`}
                  exercise={exercise}
                  target={item.count}
                  note={item.note}
                  accent={day.accent}
                  initial={logs[key(item.slug, 0)]?.reps ?? 0}
                  best={record?.bestReps ?? null}
                  bestDate={record?.bestRepsOn ?? null}
                  onChange={(total) => saveSet(item.slug, 0, { reps: total })}
                  onRecord={() => {
                    setCelebrating(item.slug);
                    setTimeout(() => setCelebrating(null), 2600);
                  }}
                />
              );
            }

            return (
              <ExerciseCard
                key={`${block.title}-${item.slug}`}
                item={item}
                exercise={exercise}
                logs={logs}
                last={lastSessions[item.slug] ?? null}
                record={records[item.slug] ?? null}
                accent={day.accent}
                readOnly={readOnly}
                celebrating={celebrating === item.slug}
                onSave={saveSet}
                onClear={clearSet}
              />
            );
          })}
        </CollapsibleBlock>
      ))}

      {rest && <RestTimer key={rest.token} seconds={rest.seconds} onDismiss={() => setRest(null)} />}
    </div>
  );
}

/* ─────────────────────────────── exercise card ─────────────────────────────── */

function ExerciseCard({
  item,
  exercise,
  logs,
  last,
  record,
  accent,
  readOnly,
  celebrating,
  onSave,
  onClear,
}: {
  item: SessionItem;
  exercise: Exercise;
  logs: Record<string, SetLog>;
  last: { date: string; sets: SetLog[] } | null;
  record: PersonalRecord | null;
  accent: string;
  readOnly: boolean;
  celebrating: boolean;
  onSave: (slug: string, index: number, payload: Partial<SetLog>, rest?: number) => void;
  onClear: (slug: string, index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const isWarmup = item.kind === "warmup";
  const done = Array.from({ length: item.sets }, (_, i) => logs[key(item.slug, i)]).filter(Boolean).length;
  const restSeconds = parseRest(item.rest);

  return (
    <article
      className={`card overflow-hidden transition ${celebrating ? "ring-2 ring-lime" : ""}`}
      style={done === item.sets && done > 0 ? { borderColor: `${accent}66` } : undefined}
    >
      <div className="flex items-center gap-3 p-3">
        <Link href={`/exercise/${exercise.slug}`} className="pressable shrink-0">
          <ClipThumb clips={exercise.clips} className="h-14 w-14" />
        </Link>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="min-w-0 flex-1 text-left"
          disabled={isWarmup && readOnly}
        >
          <p className="truncate text-[15px] font-semibold text-white">{exercise.name}</p>
          <p className="truncate text-xs text-mist-400">{item.note ?? exercise.target}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="tabular rounded-md bg-white/8 px-1.5 py-0.5 text-[11px] font-semibold text-mist-200">
              {item.sets} × {item.reps}
            </span>
            {record?.bestWeight ? (
              <span className="tabular rounded-md bg-flame/15 px-1.5 py-0.5 text-[11px] font-semibold text-flame-soft">
                PR {record.bestWeight} kg
              </span>
            ) : null}
            {last && (
              <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-mist-400">
                last {summarise(last.sets)}
              </span>
            )}
          </div>
        </button>

        {!isWarmup && (
          <div className="shrink-0 text-right">
            <p className="tabular text-sm font-bold text-white">
              {done}
              <span className="text-mist-400">/{item.sets}</span>
            </p>
            <p className="text-[10px] uppercase tracking-wide text-mist-400">sets</p>
          </div>
        )}
      </div>

      {celebrating && (
        <p className="animate-pop bg-lime/15 px-4 py-2 text-center text-xs font-bold text-lime">
          🎉 New personal record!
        </p>
      )}

      {open && !isWarmup && !readOnly && (
        <div className="border-t border-white/8 bg-black/20 p-3">
          <div className="space-y-2">
            {Array.from({ length: item.sets }, (_, index) => (
              <SetRow
                key={index}
                index={index}
                tracking={exercise.tracking}
                log={logs[key(item.slug, index)]}
                previous={last?.sets.find((set) => set.setIndex === index) ?? null}
                accent={accent}
                onSave={(payload) => onSave(item.slug, index, payload, restSeconds)}
                onClear={() => onClear(item.slug, index)}
              />
            ))}
          </div>
          <Link
            href={`/exercise/${exercise.slug}`}
            className="mt-3 block rounded-xl bg-white/6 py-2 text-center text-xs font-semibold text-mist-200"
          >
            How to perform it →
          </Link>
        </div>
      )}

      {open && (isWarmup || readOnly) && (
        <div className="border-t border-white/8 bg-black/20 p-3">
          <Link
            href={`/exercise/${exercise.slug}`}
            className="block rounded-xl bg-white/6 py-2 text-center text-xs font-semibold text-mist-200"
          >
            Watch & read the steps →
          </Link>
        </div>
      )}
    </article>
  );
}

/* ─────────────────────────────── set row ─────────────────────────────── */

function SetRow({
  index,
  tracking,
  log,
  previous,
  accent,
  onSave,
  onClear,
}: {
  index: number;
  tracking: Exercise["tracking"];
  log?: SetLog;
  previous: SetLog | null;
  accent: string;
  onSave: (payload: Partial<SetLog>) => void;
  onClear: () => void;
}) {
  const [weight, setWeight] = useState(log?.weightKg?.toString() ?? "");
  const [reps, setReps] = useState(log?.reps?.toString() ?? "");
  const [duration, setDuration] = useState(log?.durationSec?.toString() ?? "");

  const logged = Boolean(log);
  const showWeight = tracking === "reps-weight";
  const showDuration = tracking === "time" || tracking === "hold";

  const commit = () => {
    if (logged) {
      onClear();
      return;
    }
    const payload: Partial<SetLog> = {};
    if (showDuration) {
      const value = Number(duration || previous?.durationSec || 0);
      if (!value) return;
      payload.durationSec = value;
    } else {
      const value = Number(reps || previous?.reps || 0);
      if (!value) return;
      payload.reps = value;
      if (showWeight && weight) payload.weightKg = Number(weight);
    }
    if (!reps && previous?.reps && !showDuration) setReps(String(previous.reps));
    onSave(payload);
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border p-2 transition ${
        logged ? "border-transparent bg-white/[.07]" : "border-white/8 bg-white/[.02]"
      }`}
    >
      <span
        className="tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
        style={{ background: logged ? accent : "rgba(255,255,255,.07)", color: logged ? "#08090b" : "#a4adbb" }}
      >
        {index + 1}
      </span>

      {showWeight && (
        <Field
          value={weight}
          onChange={setWeight}
          placeholder={previous?.weightKg?.toString() ?? "—"}
          suffix="kg"
          disabled={logged}
          step={2.5}
        />
      )}

      {showDuration ? (
        <Field
          value={duration}
          onChange={setDuration}
          placeholder={previous?.durationSec?.toString() ?? "—"}
          suffix="sec"
          disabled={logged}
          step={5}
        />
      ) : (
        <Field
          value={reps}
          onChange={setReps}
          placeholder={previous?.reps?.toString() ?? "—"}
          suffix="reps"
          disabled={logged}
          step={1}
        />
      )}

      <button
        type="button"
        onClick={commit}
        aria-label={logged ? "Undo set" : "Log set"}
        className={`pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-bold ${
          logged ? "bg-white/10 text-mist-300" : "bg-white text-ink-900"
        }`}
      >
        {logged ? "↺" : "✓"}
      </button>
    </div>
  );
}

function Field({
  value,
  onChange,
  placeholder,
  suffix,
  disabled,
  step,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  suffix: string;
  disabled: boolean;
  step: number;
}) {
  const bump = (delta: number) => {
    const next = Math.max(0, (Number(value || placeholder.replace("—", "")) || 0) + delta);
    onChange(next % 1 === 0 ? String(next) : next.toFixed(1));
  };

  return (
    <div className="flex min-w-0 flex-1 items-center rounded-lg bg-black/25">
      <button
        type="button"
        onClick={() => bump(-step)}
        disabled={disabled}
        aria-label={`decrease ${suffix}`}
        className="pressable h-9 w-8 shrink-0 text-mist-400 disabled:opacity-30"
      >
        −
      </button>
      <div className="flex min-w-0 flex-1 items-baseline justify-center gap-0.5">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="tabular w-full min-w-0 bg-transparent text-center text-base font-semibold text-white outline-none placeholder:text-mist-400/60 disabled:text-mist-300"
        />
        <span className="shrink-0 pr-0.5 text-[10px] text-mist-400">{suffix}</span>
      </div>
      <button
        type="button"
        onClick={() => bump(step)}
        disabled={disabled}
        aria-label={`increase ${suffix}`}
        className="pressable h-9 w-8 shrink-0 text-mist-400 disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

function ProgressRing({ percent, accent }: { percent: number; accent: string }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative h-11 w-11 shrink-0">
      <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={accent}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
          style={{ transition: "stroke-dashoffset 400ms ease" }}
        />
      </svg>
      <span className="tabular absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
        {percent}%
      </span>
    </div>
  );
}

/* ─────────────────────────────── helpers ─────────────────────────────── */

function parseRest(rest?: string) {
  if (!rest) return 60;
  const match = rest.match(/(\d+)/);
  return match ? Number(match[1]) : 60;
}

function summarise(sets: SetLog[]) {
  const best = sets.reduce<SetLog | null>((top, set) => {
    if (!top) return set;
    return (set.weightKg ?? 0) > (top.weightKg ?? 0) ? set : top;
  }, null);
  if (!best) return "—";
  if (best.durationSec) return `${best.durationSec}s`;
  if (best.weightKg) return `${best.weightKg}kg × ${best.reps ?? "—"}`;
  return `${best.reps ?? "—"} reps`;
}
