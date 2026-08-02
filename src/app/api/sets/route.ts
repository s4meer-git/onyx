import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { deleteSet, getSetsForDate, saveSet } from "@/lib/queries";
import { getExercise } from "@/data/exercises";
import { todayISO } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unauthorised = () => NextResponse.json({ error: "Not authorised" }, { status: 401 });

const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function GET(request: Request) {
  if (!(await getSessionUser())) return unauthorised();
  const date = new URL(request.url).searchParams.get("date") ?? todayISO();
  return NextResponse.json({ date, sets: await getSetsForDate(date) });
}

export async function POST(request: Request) {
  if (!(await getSessionUser())) return unauthorised();

  const body = await request.json().catch(() => null);
  if (!body?.exerciseSlug || !getExercise(body.exerciseSlug)) {
    return NextResponse.json({ error: "Unknown exercise" }, { status: 400 });
  }
  const setIndex = num(body.setIndex);
  if (setIndex === null || setIndex < 0) {
    return NextResponse.json({ error: "setIndex is required" }, { status: 400 });
  }

  const reps = num(body.reps);
  const weightKg = num(body.weightKg);
  const durationSec = num(body.durationSec);
  if (reps === null && weightKg === null && durationSec === null) {
    return NextResponse.json({ error: "Nothing to log" }, { status: 400 });
  }

  const saved = await saveSet({
    workoutDate: typeof body.workoutDate === "string" ? body.workoutDate : todayISO(),
    dayKey: String(body.dayKey ?? ""),
    exerciseSlug: body.exerciseSlug,
    setIndex,
    reps,
    weightKg,
    durationSec,
    note: typeof body.note === "string" ? body.note : null,
  });

  return NextResponse.json({ set: saved });
}

export async function DELETE(request: Request) {
  if (!(await getSessionUser())) return unauthorised();
  const params = new URL(request.url).searchParams;
  const date = params.get("date");
  const slug = params.get("exerciseSlug");
  const index = num(params.get("setIndex"));
  if (!date || !slug || index === null) {
    return NextResponse.json({ error: "date, exerciseSlug and setIndex are required" }, { status: 400 });
  }
  await deleteSet(date, slug, index);
  return NextResponse.json({ ok: true });
}
