import { NextResponse } from "next/server";
import { CORS_HEADERS, authoriseApi } from "@/lib/api-auth";
import { EXERCISE_BY_SLUG } from "@/data/exercises";
import { SCHEDULE, totalSets } from "@/data/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

/** The full week's programme — static data, no personal information. */
export async function GET(request: Request) {
  if (!(await authoriseApi(request))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401, headers: CORS_HEADERS });
  }

  return NextResponse.json(
    {
      days: SCHEDULE.map((day) => ({
        key: day.key,
        name: day.name,
        focus: day.focus,
        plannedSets: totalSets(day),
        blocks: day.blocks.map((block) => ({
          title: block.title,
          kind: block.kind,
          items: block.items.map((item) => ({
            slug: item.slug,
            name: EXERCISE_BY_SLUG[item.slug]?.name ?? item.slug,
            sets: item.sets,
            reps: item.reps,
            rest: item.rest ?? null,
            note: item.note ?? null,
          })),
        })),
      })),
    },
    { headers: CORS_HEADERS },
  );
}
