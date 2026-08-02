import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDayCompletion, markDayComplete } from "@/lib/queries";
import { todayISO } from "@/lib/date";
import { getDay } from "@/data/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }
  const date = new URL(request.url).searchParams.get("date") ?? todayISO();
  return NextResponse.json({ date, completedAt: await getDayCompletion(date) });
}

/** Marks a session finished — the "Finish workout" button on the day screen. */
export async function POST(request: Request) {
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const date = typeof body.date === "string" ? body.date : todayISO();
  const dayKey = String(body.dayKey ?? "");
  if (!getDay(dayKey)) {
    return NextResponse.json({ error: "Unknown day" }, { status: 400 });
  }
  await markDayComplete(date, dayKey, body.complete !== false);
  return NextResponse.json({ ok: true, completedAt: await getDayCompletion(date) });
}
