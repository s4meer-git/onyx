import { NextResponse } from "next/server";
import { CORS_HEADERS, authoriseApi } from "@/lib/api-auth";
import { getStreak } from "@/lib/queries";
import { recentDates, todayISO } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  if (!(await authoriseApi(request))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401, headers: CORS_HEADERS });
  }

  const today = todayISO();
  const streak = await getStreak(today);
  const active = new Set(streak.activeDates);

  return NextResponse.json(
    {
      date: today,
      currentStreak: streak.current,
      longestStreak: streak.longest,
      loggedToday: streak.todayLogged,
      totalWorkouts: streak.totalWorkouts,
      lastWorkoutDate: streak.lastWorkoutDate,
      last7Days: recentDates(7, today).map((date) => ({ date, active: active.has(date) })),
      last30Days: recentDates(30, today).map((date) => ({ date, active: active.has(date) })),
    },
    { headers: CORS_HEADERS },
  );
}
