import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { BodyMap } from "@/components/BodyMap";
import { ClipThumb } from "@/components/ClipPlayer";
import { CollapsibleBlock } from "@/components/CollapsibleBlock";
import { EXERCISE_BY_SLUG } from "@/data/exercises";
import { regionIntensity } from "@/data/muscle-map";
import {
  DAY_KEYS,
  dayKeyFromDate,
  focusExercises,
  getDay,
  loggableExercises,
  totalSets,
} from "@/data/schedule";
import { todayISO } from "@/lib/date";
import { getPersonalRecords } from "@/lib/queries";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return DAY_KEYS.map((key) => ({ key }));
}

/** Read-only plan for any day of the week: exercises, targets and videos. */
export default async function DayPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const day = getDay(key);
  if (!day) notFound();

  const todayKey = dayKeyFromDate(new Date(`${todayISO()}T12:00:00`));
  const records = await getPersonalRecords();

  return (
    <main className="space-y-5" style={{ ["--accent" as string]: day.accent }}>
      <header className="flex items-center gap-3 px-1">
        <BackButton fallback="/schedule" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: day.accent }}>
            {day.name}
          </p>
          <h1 className="text-lg font-bold leading-tight text-white">{day.focus}</h1>
        </div>
        {day.key === todayKey && (
          <Link
            href="/session"
            className="pressable shrink-0 rounded-full px-4 py-2 text-xs font-bold text-ink-900"
            style={{ background: day.accent }}
          >
            Start
          </Link>
        )}
      </header>

      <section className="card p-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-mist-400">
          What this day trains
        </h2>
        <BodyMap
          intensity={regionIntensity(
            focusExercises(day).map((item) => item.slug),
            Object.fromEntries(focusExercises(day).map((item) => [item.slug, item.sets])),
          )}
          accent={day.accent}
          className="mt-3"
        />
      </section>

      <div className="tabular flex gap-2 px-1 text-xs text-mist-400">
        <span className="rounded-lg bg-white/6 px-2 py-1">{loggableExercises(day).length} exercises</span>
        <span className="rounded-lg bg-white/6 px-2 py-1">{totalSets(day)} working sets</span>
      </div>

      {day.blocks.map((block) => (
        <CollapsibleBlock
          key={block.title}
          title={block.title}
          kind={block.kind}
          count={block.items.length}
          note={block.note}
        >
          <div className="space-y-2">
            {block.items.map((item) => {
              const exercise = EXERCISE_BY_SLUG[item.slug];
              if (!exercise) return null;
              const record = records[item.slug];

              return (
                <Link
                  key={`${block.title}-${item.slug}`}
                  href={`/exercise/${item.slug}`}
                  className="pressable card flex items-center gap-3 p-3"
                >
                  <ClipThumb clips={exercise.clips} className="h-14 w-14 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-white">{exercise.name}</p>
                    <p className="truncate text-xs text-mist-400">{item.note ?? exercise.target}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="tabular rounded-md bg-white/8 px-1.5 py-0.5 text-[11px] font-semibold text-mist-200">
                        {item.count ? `Target ${item.count}` : `${item.sets} × ${item.reps}`}
                      </span>
                      {item.rest && (
                        <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-mist-400">
                          rest {item.rest}
                        </span>
                      )}
                      {record?.bestWeight ? (
                        <span className="tabular rounded-md bg-flame/15 px-1.5 py-0.5 text-[11px] font-semibold text-flame-soft">
                          PR {record.bestWeight} kg
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <span className="shrink-0 text-mist-400">›</span>
                </Link>
              );
            })}
          </div>
        </CollapsibleBlock>
      ))}
    </main>
  );
}
