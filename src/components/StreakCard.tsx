import { BodyMap } from "@/components/BodyMap";
import { REGION_LABELS } from "@/data/muscle-map";
import { addDays, isoToDate, todayISO } from "@/lib/date";
import type { StreakInfo } from "@/lib/queries";

const WEEK_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

/** Monday-first list of the current week's dates. */
function currentWeek(today: string) {
  const jsDay = isoToDate(today).getDay(); // 0 = Sunday
  const offsetToMonday = jsDay === 0 ? -6 : 1 - jsDay;
  return Array.from({ length: 7 }, (_, i) => addDays(today, offsetToMonday + i));
}

type Props = {
  streak: StreakInfo;
  /** Muscles today's session will train, region id → 0–1. */
  bodyIntensity: Record<string, number>;
  accent: string;
  dayName: string;
};

export function StreakCard({ streak, bodyIntensity, accent }: Props) {
  const today = todayISO();
  const week = currentWeek(today);
  const active = new Set(streak.activeDates);
  const atRisk = streak.current > 0 && !streak.todayLogged;

  const topMuscles = Object.entries(bodyIntensity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([region]) => REGION_LABELS[region] ?? region);

  return (
    <section className="card animate-pop relative overflow-hidden p-5">
      <div
        className="pointer-events-none absolute -left-16 -top-20 h-52 w-52 rounded-full blur-3xl"
        style={{ background: atRisk ? "rgba(255,122,26,.16)" : "rgba(255,122,26,.28)" }}
      />

      <div className="relative flex gap-4">
        {/* Streak */}
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mist-400">
            {atRisk ? "Streak at risk" : "Current streak"}
          </p>

          <div className="mt-2 flex items-center gap-3">
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
              {streak.todayLogged && (
                <span className="absolute h-9 w-9 rounded-full bg-flame/35 blur-lg" aria-hidden />
              )}
              {/* Microsoft Fluent 3D fire — dimmed until today is logged. */}
              <img
                src="/fire.png"
                alt=""
                width={48}
                height={48}
                className={`relative h-12 w-12 ${
                  streak.todayLogged ? "animate-flame" : "opacity-35 grayscale"
                }`}
              />
            </span>

            <span className="flex items-end gap-1.5">
              <span className="tabular text-5xl font-bold leading-none text-white">
                {streak.current}
              </span>
              <span className="pb-1 text-sm font-medium text-mist-300">
                {streak.current === 1 ? "day" : "days"}
              </span>
            </span>
          </div>

          <p className="mt-2.5 min-h-8 text-xs leading-snug text-mist-400">
            {streak.todayLogged
              ? "Logged today — nice work."
              : streak.current > 0
                ? "Log a set today to keep it alive."
                : "Log your first set to start a streak."}
          </p>

          <div className="mt-auto flex justify-between gap-1 pt-3">
            {week.map((date, index) => {
              const done = active.has(date);
              const isToday = date === today;
              const future = date > today;
              return (
                <div key={date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={`flex h-8 w-full items-center justify-center rounded-lg border text-[11px] font-bold transition ${
                      done
                        ? "border-transparent bg-flame text-ink-900"
                        : isToday
                          ? "border-flame/60 bg-flame/10 text-flame"
                          : future
                            ? "border-white/5 bg-white/[.02] text-ink-500"
                            : "border-white/8 bg-white/[.03] text-mist-400"
                    }`}
                  >
                    {done ? "✓" : isoToDate(date).getDate()}
                  </div>
                  <span className={`text-[9px] ${isToday ? "text-flame" : "text-mist-400"}`}>
                    {WEEK_LABELS[index]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's muscles */}
        <div className="w-[43%] shrink-0">
          <p
            className="text-center text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: accent }}
          >
            Today
          </p>
          <BodyMap
            intensity={bodyIntensity}
            accent={accent}
            showLegend={false}
            compact
            className="mt-2"
          />
          <p className="mt-2 text-center text-[10px] leading-tight text-mist-400">
            {topMuscles.join(" · ")}
          </p>
        </div>
      </div>

      {/* Totals run the full width, under both columns. */}
      <div className="relative mt-4 grid grid-cols-2 gap-2">
        <Stat label="Best streak" value={`${streak.longest} ${streak.longest === 1 ? "day" : "days"}`} />
        <Stat label="Total sessions" value={String(streak.totalWorkouts)} />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[.04] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-mist-400">{label}</p>
      <p className="tabular mt-0.5 text-base font-semibold text-white">{value}</p>
    </div>
  );
}
