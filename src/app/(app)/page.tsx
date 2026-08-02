import Link from "next/link";
import { StreakCard } from "@/components/StreakCard";
import { ClipThumb } from "@/components/ClipPlayer";
import { EXERCISE_BY_SLUG } from "@/data/exercises";
import { regionIntensity } from "@/data/muscle-map";
import {
  SCHEDULE,
  dayKeyFromDate,
  focusExercises,
  getDay,
  loggableExercises,
  totalSets,
} from "@/data/schedule";
import { formatCompact, todayISO } from "@/lib/date";
import { USER_NAME, getSetsForDate, getStreak, getTotals } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const today = todayISO();
  const dayKey = dayKeyFromDate(new Date(`${today}T12:00:00`));
  const day = getDay(dayKey)!;

  const [streak, sets, totals] = await Promise.all([
    getStreak(today),
    getSetsForDate(today),
    getTotals(),
  ]);

  const planned = totalSets(day);
  const percent = planned === 0 ? 0 : Math.min(100, Math.round((sets.length / planned) * 100));
  const exercises = loggableExercises(day);
  const preview = exercises.slice(0, 4);

  // Muscles today will hit, brightest where the most sets land. Uses the day's
  // lifting blocks only — the daily bodyweight counts run every day and would
  // otherwise light the same regions on all seven.
  const focus = focusExercises(day);
  const muscleHeat = regionIntensity(
    focus.map((item) => item.slug),
    Object.fromEntries(focus.map((item) => [item.slug, item.sets])),
  );
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <main className="space-y-5" style={{ ["--accent" as string]: day.accent }}>
      <header className="relative flex items-end justify-between gap-2 px-1">
        <div className="min-w-0">
          <p className="text-xs text-mist-400">{greeting}</p>
          <h1 className="truncate text-2xl font-bold text-white">{USER_NAME}</h1>
        </div>

        {/* Brand mark: rises from BEHIND the streak card, lit by a warm bloom so
            it belongs to the header's ambient glow rather than sitting on top. */}
        <div className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 select-none">
          <div
            className="absolute left-1/2 top-1/2 h-16 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
            style={{ background: "rgba(255,138,60,.14)" }}
          />
          <img
            src="/logo.svg"
            alt="ONYX"
            className="brand-mark relative w-auto"
            style={{ height: "clamp(44px, 13.5vw, 58px)" }}
          />
        </div>

        <p className="shrink-0 pb-1 text-xs text-mist-400">{formatCompact(today)}</p>
      </header>

      <StreakCard
        streak={streak}
        bodyIntensity={muscleHeat}
        accent={day.accent}
        dayName={day.short}
      />

      {/* Today's workout */}
      <Link href="/session" className="pressable card relative block overflow-hidden p-5">
        <div
          className="pointer-events-none absolute -left-10 -top-16 h-44 w-44 rounded-full blur-3xl"
          style={{ background: `${day.accent}33` }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: day.accent }}>
              Today · {day.name}
            </p>
            <h2 className="mt-1 text-xl font-bold leading-tight text-white">{day.focus}</h2>
            <p className="tabular mt-1 text-xs text-mist-400">
              {exercises.length} exercises · {planned} sets
              {percent > 0 ? ` · ${percent}% done` : ""}
            </p>
          </div>
          <span
            className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-ink-900"
            style={{ background: day.accent }}
          >
            {percent === 0 ? "Start" : percent === 100 ? "Review" : "Resume"}
          </span>
        </div>

        <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${percent}%`, background: day.accent }}
          />
        </div>

        <div className="relative mt-4 flex gap-2">
          {preview.map((item) => {
            const exercise = EXERCISE_BY_SLUG[item.slug];
            return exercise ? (
              <ClipThumb key={item.slug} clips={exercise.clips} className="h-16 flex-1" />
            ) : null;
          })}
          {exercises.length > preview.length && (
            <div className="flex h-16 flex-1 items-center justify-center rounded-xl bg-white/5 text-xs font-semibold text-mist-300">
              +{exercises.length - preview.length}
            </div>
          )}
        </div>
      </Link>

      {/* Lifetime totals */}
      <section className="grid grid-cols-3 gap-2">
        <Tile label="Sets" value={totals.sets.toLocaleString()} />
        <Tile label="Reps" value={totals.reps.toLocaleString()} />
        <Tile label="Volume" value={`${Math.round(totals.volumeKg / 1000)}t`} hint="tonnes lifted" />
      </section>

      {/* Week strip */}
      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-mist-400">This week</h2>
          <Link href="/schedule" className="text-xs font-semibold text-mist-300">
            See all →
          </Link>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {SCHEDULE.map((entry) => (
            <Link
              key={entry.key}
              href={`/day/${entry.key}`}
              className="pressable card w-32 shrink-0 p-3"
              style={entry.key === dayKey ? { borderColor: `${entry.accent}88` } : undefined}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: entry.accent }}>
                {entry.short}
              </p>
              <p className="mt-1 line-clamp-2 text-[13px] font-semibold leading-snug text-white">
                {entry.focus}
              </p>
              <p className="tabular mt-2 text-[11px] text-mist-400">{totalSets(entry)} sets</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-3">
      <p className="text-[10px] uppercase tracking-wider text-mist-400">{label}</p>
      <p className="tabular mt-1 text-lg font-bold text-white">{value}</p>
      {hint && <p className="text-[10px] text-mist-400">{hint}</p>}
    </div>
  );
}
