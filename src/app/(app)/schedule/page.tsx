import Link from "next/link";
import { ClipThumb } from "@/components/ClipPlayer";
import { EXERCISE_BY_SLUG } from "@/data/exercises";
import { SCHEDULE, dayKeyFromDate, loggableExercises, totalSets } from "@/data/schedule";
import { todayISO } from "@/lib/date";

export const dynamic = "force-dynamic";

export default function SchedulePage() {
  const todayKey = dayKeyFromDate(new Date(`${todayISO()}T12:00:00`));

  return (
    <main className="space-y-4">
      <header className="px-1">
        <h1 className="text-2xl font-bold text-white">Schedule</h1>
        <p className="text-xs text-mist-400">Your weekly split — tap a day for exercises and videos.</p>
      </header>

      <div className="space-y-3">
        {SCHEDULE.map((day) => {
          const exercises = loggableExercises(day);
          const isToday = day.key === todayKey;

          return (
            <Link
              key={day.key}
              href={`/day/${day.key}`}
              className="pressable card relative block overflow-hidden p-4"
              style={isToday ? { borderColor: `${day.accent}88` } : undefined}
            >
              <div
                className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full blur-3xl"
                style={{ background: `${day.accent}26` }}
              />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[11px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: day.accent }}
                    >
                      {day.name}
                    </span>
                    {isToday && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white">
                        TODAY
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1 truncate text-lg font-bold text-white">{day.focus}</h2>
                  <p className="tabular mt-0.5 text-xs text-mist-400">
                    {exercises.length} exercises · {totalSets(day)} sets
                  </p>
                </div>
                <span className="shrink-0 pt-1 text-mist-400">›</span>
              </div>

              <div className="relative mt-3 flex gap-1.5">
                {exercises.slice(0, 5).map((item) => {
                  const exercise = EXERCISE_BY_SLUG[item.slug];
                  return exercise ? (
                    <ClipThumb key={item.slug} clips={exercise.clips} className="h-12 flex-1" />
                  ) : null;
                })}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
