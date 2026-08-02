import { NextResponse } from "next/server";
import { CORS_HEADERS, authoriseApi } from "@/lib/api-auth";
import { getPersonalRecords, getStreak, getTotals } from "@/lib/queries";
import { EXERCISE_BY_SLUG } from "@/data/exercises";
import { todayISO } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  if (!(await authoriseApi(request))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401, headers: CORS_HEADERS });
  }

  const [streak, totals, records] = await Promise.all([
    getStreak(),
    getTotals(),
    getPersonalRecords(),
  ]);

  return NextResponse.json(
    {
      date: todayISO(),
      streak: { current: streak.current, longest: streak.longest, totalWorkouts: streak.totalWorkouts },
      totals,
      personalRecords: Object.values(records)
        .map((record) => ({
          ...record,
          name: EXERCISE_BY_SLUG[record.exerciseSlug]?.name ?? record.exerciseSlug,
          estimated1RM: record.estimated1RM === null ? null : Math.round(record.estimated1RM * 10) / 10,
        }))
        .sort((a, b) => (b.estimated1RM ?? 0) - (a.estimated1RM ?? 0)),
    },
    { headers: CORS_HEADERS },
  );
}
