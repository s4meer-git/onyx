import { BackButton } from "@/components/BackButton";
import { DailyLog } from "@/components/DailyLog";
import { SessionClient } from "@/components/SessionClient";
import { EXERCISE_BY_SLUG } from "@/data/exercises";
import { dayExercises, dayKeyFromDate, getDay } from "@/data/schedule";
import { formatLong, todayISO } from "@/lib/date";
import {
  getDailyMetric,
  getDayCompletion,
  getLastSessions,
  getLatestWeight,
  getPersonalRecords,
  getSetsForDate,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Today's live session — this is where sets actually get logged. */
export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date = params.date ?? todayISO();
  const dayKey = dayKeyFromDate(new Date(`${date}T12:00:00`));
  const day = getDay(dayKey)!;
  const items = dayExercises(day);

  const [logs, records, completedAt, lastSessions, metric, lastWeight] = await Promise.all([
    getSetsForDate(date),
    getPersonalRecords(),
    getDayCompletion(date),
    getLastSessions([...new Set(items.map((item) => item.slug))], date),
    getDailyMetric(date),
    getLatestWeight(date),
  ]);

  return (
    <main className="space-y-4" style={{ ["--accent" as string]: day.accent }}>
      <header className="flex items-center gap-3 px-1">
        <BackButton fallback="/" />
        <div className="min-w-0">
          <p className="text-xs text-mist-400">{formatLong(date)}</p>
          <h1 className="text-lg font-bold leading-tight text-white">{day.focus}</h1>
        </div>
      </header>

      <DailyLog
        date={date}
        initialSteps={metric.steps}
        initialWeight={metric.weightKg}
        lastWeight={lastWeight?.weightKg ?? null}
        accent={day.accent}
      />

      <SessionClient
        day={day}
        date={date}
        items={items}
        exercises={EXERCISE_BY_SLUG}
        initialLogs={logs}
        lastSessions={lastSessions}
        records={records}
        completedAt={completedAt}
      />
    </main>
  );
}
