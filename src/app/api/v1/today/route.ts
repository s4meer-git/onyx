import { NextResponse } from "next/server";
import { CORS_HEADERS, authoriseApi } from "@/lib/api-auth";
import { getDayCompletion, getSetsForDate, getStreak } from "@/lib/queries";
import { todayISO } from "@/lib/date";
import { EXERCISE_BY_SLUG } from "@/data/exercises";
import { dayKeyFromDate, getDay, loggableExercises, totalSets } from "@/data/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  if (!(await authoriseApi(request))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401, headers: CORS_HEADERS });
  }

  const params = new URL(request.url).searchParams;
  const date = params.get("date") ?? todayISO();
  const dayKey = params.get("day") ?? dayKeyFromDate(new Date(`${date}T12:00:00`));
  const day = getDay(dayKey);

  if (!day) {
    return NextResponse.json({ error: "Unknown day" }, { status: 404, headers: CORS_HEADERS });
  }

  const [sets, completedAt, streak] = await Promise.all([
    getSetsForDate(date),
    getDayCompletion(date),
    getStreak(date),
  ]);

  const byExercise = new Map<string, typeof sets>();
  for (const set of sets) {
    const list = byExercise.get(set.exerciseSlug) ?? [];
    list.push(set);
    byExercise.set(set.exerciseSlug, list);
  }

  const planned = totalSets(day);
  const logged = sets.length;

  return NextResponse.json(
    {
      date,
      day: { key: day.key, name: day.name, focus: day.focus },
      progress: {
        plannedSets: planned,
        loggedSets: logged,
        percent: planned === 0 ? 0 : Math.round((logged / planned) * 100),
        completedAt,
      },
      streak: { current: streak.current, longest: streak.longest, loggedToday: streak.todayLogged },
      blocks: day.blocks.map((block) => ({
        title: block.title,
        kind: block.kind,
        items: block.items.map((item) => {
          const exercise = EXERCISE_BY_SLUG[item.slug];
          return {
            slug: item.slug,
            name: exercise?.name ?? item.slug,
            target: exercise?.target ?? null,
            plannedSets: item.sets,
            targetReps: item.reps,
            rest: item.rest ?? null,
            tracking: exercise?.tracking ?? "reps",
            loggedSets: (byExercise.get(item.slug) ?? []).map((set) => ({
              setIndex: set.setIndex,
              reps: set.reps,
              weightKg: set.weightKg,
              durationSec: set.durationSec,
            })),
          };
        }),
      })),
      exercisesRemaining: loggableExercises(day).filter((item) => !byExercise.has(item.slug)).length,
    },
    { headers: CORS_HEADERS },
  );
}
