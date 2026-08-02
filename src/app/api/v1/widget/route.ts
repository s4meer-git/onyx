import { NextResponse } from "next/server";
import { CORS_HEADERS, authoriseApi } from "@/lib/api-auth";
import { addDays, isoToDate, todayISO } from "@/lib/date";
import { getSetsForDate, getStreak, getTotals } from "@/lib/queries";
import { dayKeyFromDate, focusExercises, getDay, totalSets } from "@/data/schedule";
import { EXERCISE_BY_SLUG } from "@/data/exercises";
import { REGION_LABELS, regionIntensity } from "@/data/muscle-map";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

/**
 * One flat payload shaped for home-screen widgets (Widgy, Scriptable, etc.).
 *
 * Everything is a top-level key and pre-formatted as a display string, because
 * widget builders bind a text layer to a single value — they shouldn't have to
 * do arithmetic, date maths or string joining.
 */
export async function GET(request: Request) {
  if (!(await authoriseApi(request))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401, headers: CORS_HEADERS });
  }

  const today = todayISO();
  const dayKey = dayKeyFromDate(new Date(`${today}T12:00:00`));
  const day = getDay(dayKey)!;

  const [streak, sets, totals] = await Promise.all([
    getStreak(today),
    getSetsForDate(today),
    getTotals(),
  ]);

  const planned = totalSets(day);
  const logged = sets.length;
  const percent = planned === 0 ? 0 : Math.min(100, Math.round((logged / planned) * 100));

  /* Monday-first week, as both an array and a glyph string a text layer can show. */
  const jsDay = isoToDate(today).getDay();
  const offsetToMonday = jsDay === 0 ? -6 : 1 - jsDay;
  const active = new Set(streak.activeDates);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, offsetToMonday + i);
    return {
      date,
      day: ["M", "T", "W", "T", "F", "S", "S"][i],
      done: active.has(date),
      isToday: date === today,
      future: date > today,
    };
  });

  const focus = focusExercises(day);
  const muscles = Object.entries(
    regionIntensity(
      focus.map((item) => item.slug),
      Object.fromEntries(focus.map((item) => [item.slug, item.sets])),
    ),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([region]) => REGION_LABELS[region] ?? region);

  const nextUp = focus.find((item) => !sets.some((set) => set.exerciseSlug === item.slug));

  // A 10-cell bar drawn with block glyphs, for builders with no progress widget.
  const filled = Math.round((percent / 100) * 10);
  const progressBar = "█".repeat(filled) + "░".repeat(10 - filled);

  return NextResponse.json(
    {
      /* ── Streak ── */
      streak: streak.current,
      streakText: `${streak.current} ${streak.current === 1 ? "day" : "days"}`,
      loggedToday: streak.todayLogged,
      flame: streak.todayLogged ? "🔥" : "🥶",
      streakStatus: streak.todayLogged
        ? "Logged today"
        : streak.current > 0
          ? "At risk — log a set"
          : "Start a streak",
      bestStreak: streak.longest,
      bestStreakText: `${streak.longest} ${streak.longest === 1 ? "day" : "days"}`,
      totalWorkouts: streak.totalWorkouts,

      /* ── Today ── */
      date: today,
      dayName: day.name,
      dayShort: day.short,
      focus: day.focus,
      muscles: muscles.join(" · "),
      accent: day.accent,

      /* ── Progress ── */
      percent,
      percentText: `${percent}%`,
      setsLogged: logged,
      setsPlanned: planned,
      setsText: `${logged}/${planned} sets`,
      progressBar,
      nextExercise: nextUp ? (EXERCISE_BY_SLUG[nextUp.slug]?.name ?? "") : "All done",
      complete: planned > 0 && logged >= planned,

      /* ── Week strip ── */
      weekGlyphs: week.map((d) => (d.done ? "●" : d.isToday ? "◉" : d.future ? "·" : "○")).join(" "),
      weekLabels: week.map((d) => d.day).join(" "),
      week,

      /* ── Lifetime ── */
      totalSets: totals.sets,
      totalReps: totals.reps,
      totalVolumeKg: totals.volumeKg,
      totalVolumeText:
        totals.volumeKg >= 1000 ? `${(totals.volumeKg / 1000).toFixed(1)}t` : `${totals.volumeKg} kg`,

      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        ...CORS_HEADERS,
        // Widgets should never see a cached streak.
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
