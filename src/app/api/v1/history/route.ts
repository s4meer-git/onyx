import { NextResponse } from "next/server";
import { CORS_HEADERS, authoriseApi } from "@/lib/api-auth";
import { getExerciseHistory, getPersonalRecords } from "@/lib/queries";
import { EXERCISE_BY_SLUG, getExercise } from "@/data/exercises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

/** Per-exercise progression: /api/v1/history?exercise=db-bench-press */
export async function GET(request: Request) {
  if (!(await authoriseApi(request))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401, headers: CORS_HEADERS });
  }

  const slug = new URL(request.url).searchParams.get("exercise");
  if (!slug || !getExercise(slug)) {
    return NextResponse.json(
      { error: "Pass ?exercise=<slug>", slugs: Object.keys(EXERCISE_BY_SLUG) },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const [history, records] = await Promise.all([getExerciseHistory(slug, 60), getPersonalRecords()]);

  return NextResponse.json(
    {
      exercise: { slug, name: EXERCISE_BY_SLUG[slug].name, target: EXERCISE_BY_SLUG[slug].target },
      personalRecord: records[slug] ?? null,
      sessions: history,
    },
    { headers: CORS_HEADERS },
  );
}
